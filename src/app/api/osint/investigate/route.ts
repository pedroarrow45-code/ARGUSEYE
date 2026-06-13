import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildEvidenceCandidates } from '@/lib/osint/evidence';
import { extractHtmlDocument } from '@/lib/osint/extractor';
import { fetchPublicHtml } from '@/lib/osint/fetcher';
import { buildOsintQueryPlan } from '@/lib/osint/query-planner';
import { generateMarkdownReport } from '@/lib/osint/report';
import { dedupeSearchResults, isPublicHttpUrl, normalizePublicUrl } from '@/lib/osint/search/dedupe';
import { searchSearxng } from '@/lib/osint/search/searxng-provider';
import { detectInputType, maskIdentifier } from '@/lib/compliance';
import { isDatabaseConfigured, prisma } from '@/lib/db';
import type { OsintExtractedDocument, OsintLedgerEntry, OsintSearchResult } from '@/lib/osint/types';

export const dynamic = 'force-dynamic';

const investigateSchema = z.object({
  target: z.string().trim().min(2).max(180),
  caseId: z.string().trim().min(1).optional(),
});

const MAX_RESULTS_PER_QUERY = 5;
const MAX_FETCHED_PAGES = 8;

type PersistenceContext = {
  caseId: string | null;
  collectionJobId: string | null;
  persisted: boolean;
};

function safeTargetForOutput(target: string): string {
  return detectInputType(target) === 'CPF' ? maskIdentifier(target) : target;
}

function makeLedgerEntry(input: Partial<OsintLedgerEntry> & Pick<OsintLedgerEntry, 'url' | 'status'>): OsintLedgerEntry {
  return {
    fetchedAt: new Date(),
    ...input,
  };
}

async function runSearches(queries: string[]): Promise<{ results: OsintSearchResult[]; ledger: OsintLedgerEntry[] }> {
  const results: OsintSearchResult[] = [];
  const ledger: OsintLedgerEntry[] = [];

  for (const query of queries) {
    try {
      const queryResults = await searchSearxng(query, { limit: MAX_RESULTS_PER_QUERY });
      results.push(...queryResults);
      ledger.push(...queryResults.map((result) => makeLedgerEntry({
        url: result.url,
        finalUrl: result.url,
        normalizedUrl: normalizePublicUrl(result.url) ?? result.url,
        title: result.title,
        snippet: result.snippet,
        engine: result.engine,
        query,
        rank: result.rank,
        status: 'SEARCH_RESULT',
      })));
    } catch (error) {
      ledger.push(makeLedgerEntry({
        url: `searxng:${query}`,
        query,
        status: 'ERROR',
        reason: error instanceof Error ? error.message : 'Falha desconhecida ao consultar SearXNG.',
      }));
    }
  }

  return { results, ledger };
}

async function ensurePersistenceContext(target: string, requestedCaseId?: string): Promise<PersistenceContext> {
  if (!isDatabaseConfigured() || !prisma) return { caseId: null, collectionJobId: null, persisted: false };

  const now = new Date();
  const targetType = detectInputType(target) === 'CNPJ' ? 'COMPANY' : detectInputType(target) === 'COMPANY_NAME' ? 'COMPANY' : 'UNKNOWN';
  const caseRecord = requestedCaseId
    ? await prisma.case.findUnique({ where: { id: requestedCaseId } })
    : await prisma.case.create({
        data: {
          caseName: `OSINT-${now.getFullYear()}-${now.getTime()}`,
          targetName: safeTargetForOutput(target),
          targetType,
          identifierMasked: detectInputType(target) === 'CPF' || detectInputType(target) === 'CNPJ' ? maskIdentifier(target) : null,
          decisionType: 'OTHER',
          legitimatePurpose: 'Investigação OSINT pública iniciada via endpoint /api/osint/investigate.',
          context: 'Pipeline SearXNG, dedupe, fetch público, extração HTML, ledger, evidências e relatório Markdown.',
          status: 'RUNNING',
        },
      });

  if (!caseRecord) return { caseId: null, collectionJobId: null, persisted: false };

  const job = await prisma.collectionJob.create({
    data: {
      caseId: caseRecord.id,
      status: 'RUNNING',
      startedAt: now,
      mode: 'LIVE',
    },
  });

  return { caseId: caseRecord.id, collectionJobId: job.id, persisted: true };
}

async function persistLedgerEntry(input: {
  target: string;
  context: PersistenceContext;
  result?: OsintSearchResult;
  entry: OsintLedgerEntry;
}) {
  if (!input.context.persisted || !prisma) return null;
  const normalizedUrl = input.entry.normalizedUrl ?? normalizePublicUrl(input.entry.finalUrl ?? input.entry.url) ?? input.entry.url;

  return prisma.sourceLedgerEntry.create({
    data: {
      caseId: input.context.caseId,
      collectionJobId: input.context.collectionJobId,
      target: input.target,
      query: input.entry.query ?? input.result?.query,
      originalUrl: input.result?.url ?? input.entry.url,
      finalUrl: input.entry.finalUrl ?? input.entry.url,
      normalizedUrl,
      title: input.entry.title ?? input.result?.title,
      snippet: input.entry.snippet ?? input.result?.snippet,
      engine: input.entry.engine ?? input.result?.engine,
      statusCode: input.entry.httpStatus,
      contentType: input.entry.contentType,
      accessedAt: input.entry.fetchedAt,
      fetchStatus: input.entry.status,
      fetchError: input.entry.reason,
      contentHash: input.entry.contentHash,
    },
  });
}

async function persistExtractedDocument(ledgerId: string | undefined, document: OsintExtractedDocument) {
  if (!ledgerId || !prisma) return null;
  return prisma.extractedDocument.create({
    data: {
      sourceLedgerEntryId: ledgerId,
      title: document.title,
      description: document.description || null,
      headings: document.headings,
      textHash: document.textHash,
      excerpt: document.excerpt,
      textLength: document.text.length,
      extractedAt: document.fetchedAt,
    },
  });
}

async function finishCollectionJob(context: PersistenceContext, status: 'COMPLETED' | 'FAILED', errorMessage?: string) {
  if (!context.persisted || !context.collectionJobId || !prisma) return;
  await prisma.collectionJob.update({
    where: { id: context.collectionJobId },
    data: { status, completedAt: new Date(), errorMessage: errorMessage ?? null },
  });
  if (context.caseId) {
    await prisma.case.update({ where: { id: context.caseId }, data: { status } });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const parsed = investigateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join('; ') }, { status: 400 });
  }

  const outputTarget = safeTargetForOutput(parsed.data.target);
  const plan = buildOsintQueryPlan(outputTarget);
  const context = await ensurePersistenceContext(parsed.data.target, parsed.data.caseId);
  const search = await runSearches(plan.queries);
  const dedupedResults = dedupeSearchResults(search.results);
  const ledger: OsintLedgerEntry[] = [...search.ledger];
  const documents: OsintExtractedDocument[] = [];
  const persistedLedgerIds: string[] = [];
  const persistedDocumentIds: string[] = [];

  for (const result of dedupedResults.slice(0, MAX_FETCHED_PAGES)) {
    if (!isPublicHttpUrl(result.url)) {
      const skipped = makeLedgerEntry({ url: result.url, query: result.query, rank: result.rank, status: 'SKIPPED', reason: 'URL não é HTTP/HTTPS pública.' });
      ledger.push(skipped);
      const persisted = await persistLedgerEntry({ target: outputTarget, context, result, entry: skipped });
      if (persisted) persistedLedgerIds.push(persisted.id);
      continue;
    }

    try {
      const fetched = await fetchPublicHtml(result.url);
      const fetchedEntry = makeLedgerEntry({
        url: result.url,
        finalUrl: fetched.finalUrl,
        normalizedUrl: normalizePublicUrl(fetched.finalUrl) ?? fetched.finalUrl,
        title: result.title,
        snippet: result.snippet,
        engine: result.engine,
        query: result.query,
        rank: result.rank,
        status: 'FETCHED',
        httpStatus: fetched.status,
        contentType: fetched.contentType,
      });
      ledger.push(fetchedEntry);
      const persistedFetched = await persistLedgerEntry({ target: outputTarget, context, result, entry: fetchedEntry });
      if (persistedFetched) persistedLedgerIds.push(persistedFetched.id);

      const extracted = extractHtmlDocument(fetched);
      if (!extracted) {
        const skipped = makeLedgerEntry({
          url: fetched.finalUrl,
          finalUrl: fetched.finalUrl,
          normalizedUrl: normalizePublicUrl(fetched.finalUrl) ?? fetched.finalUrl,
          title: result.title,
          query: result.query,
          rank: result.rank,
          status: 'SKIPPED',
          httpStatus: fetched.status,
          contentType: fetched.contentType,
          reason: 'Documento ignorado por texto extraído muito curto.',
        });
        ledger.push(skipped);
        const persisted = await persistLedgerEntry({ target: outputTarget, context, result, entry: skipped });
        if (persisted) persistedLedgerIds.push(persisted.id);
        continue;
      }

      documents.push(extracted);
      const extractedEntry = makeLedgerEntry({
        url: result.url,
        finalUrl: extracted.finalUrl,
        normalizedUrl: normalizePublicUrl(extracted.finalUrl) ?? extracted.finalUrl,
        title: extracted.title,
        query: result.query,
        rank: result.rank,
        status: 'EXTRACTED',
        httpStatus: extracted.status,
        contentType: fetched.contentType,
        contentHash: extracted.textHash,
      });
      ledger.push(extractedEntry);
      const persistedExtracted = await persistLedgerEntry({ target: outputTarget, context, result, entry: extractedEntry });
      if (persistedExtracted) {
        persistedLedgerIds.push(persistedExtracted.id);
        const persistedDocument = await persistExtractedDocument(persistedExtracted.id, extracted);
        if (persistedDocument) persistedDocumentIds.push(persistedDocument.id);
      }
    } catch (error) {
      const errorEntry = makeLedgerEntry({
        url: result.url,
        title: result.title,
        snippet: result.snippet,
        engine: result.engine,
        query: result.query,
        rank: result.rank,
        status: 'ERROR',
        reason: error instanceof Error ? error.message : 'Falha desconhecida ao buscar/extrair fonte.',
      });
      ledger.push(errorEntry);
      const persisted = await persistLedgerEntry({ target: outputTarget, context, result, entry: errorEntry });
      if (persisted) persistedLedgerIds.push(persisted.id);
    }
  }

  const evidenceCandidates = buildEvidenceCandidates(plan.target, documents);
  const persistedEvidence = context.persisted && context.caseId
    ? await Promise.all(evidenceCandidates.filter((candidate) => candidate.confidence !== 'LOW').map((candidate) => prisma!.evidence.create({
        data: {
          caseId: context.caseId!,
          sourceName: 'OSINT público',
          sourceUrl: candidate.sourceUrl,
          sourceType: 'WEB',
          accessedAt: candidate.collectedAt,
          title: candidate.title,
          relevantExcerpt: candidate.excerpt,
          summary: candidate.reason,
          confidence: candidate.confidence,
          riskLevel: null,
          entitiesMentioned: [],
        },
      })))
    : [];
  const limitations = [
    'Pipeline inicial sem crawler profundo e sem LLM.',
    'Busca depende de SEARXNG_BASE_URL configurado e de fontes públicas HTTP/HTTPS acessíveis.',
    'Evidências são candidatas e requerem revisão humana antes de qualquer decisão.',
  ];
  const reportMarkdown = generateMarkdownReport({
    target: plan.target,
    generatedAt: plan.generatedAt,
    caseId: context.caseId ?? undefined,
    collectionJobId: context.collectionJobId ?? undefined,
    queries: plan.queries,
    documents,
    evidenceCandidates,
    ledger,
    limitations,
  });

  await finishCollectionJob(context, 'COMPLETED');

  return NextResponse.json({
    target: plan.target,
    caseId: context.caseId,
    collectionJobId: context.collectionJobId,
    persisted: context.persisted,
    persistedLedgerIds,
    persistedDocumentIds,
    persistedEvidenceIds: persistedEvidence.map((evidence) => evidence.id),
    counts: {
      searchResults: dedupedResults.length,
      ledger: ledger.length,
      documents: documents.length,
      evidenceCandidates: evidenceCandidates.length,
      persistedEvidence: persistedEvidence.length,
    },
    generatedAt: plan.generatedAt,
    queries: plan.queries,
    searchResults: dedupedResults,
    ledger,
    documents,
    evidenceCandidates,
    reportMarkdown,
    limitations,
  });
}
