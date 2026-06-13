import { detectInputType, maskIdentifier } from '@/lib/compliance';
import { generateMarkdownReport } from '@/lib/osint/report';
import type { OsintEvidenceCandidate, OsintExtractedDocument, OsintLedgerEntry } from '@/lib/osint/types';

export interface OsintInvestigationListItem {
  caseId: string;
  target: string;
  status: string;
  createdAt: Date;
  latestCollectionJob: {
    id: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
  } | null;
  sourceCount: number;
  evidenceCount: number;
}

export interface OsintInvestigationDetail {
  case: {
    id: string;
    caseName: string;
    targetName: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  collectionJobs: Array<{
    id: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }>;
  ledger: OsintLedgerEntry[];
  documents: OsintExtractedDocument[];
  evidenceCandidates: OsintEvidenceCandidate[];
  reportMarkdown: string;
  limitations: string[];
}

export function maskSensitiveTarget(value: string): string {
  return detectInputType(value) === 'CPF' || detectInputType(value) === 'CNPJ'
    ? maskIdentifier(value)
    : value;
}

export async function getRequiredOsintPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurado. Histórico OSINT exige persistência Prisma/PostgreSQL.');
  }
  const db = await import('@/lib/db');
  if (!db.prisma) {
    throw new Error('DATABASE_URL não configurado. Histórico OSINT exige persistência Prisma/PostgreSQL.');
  }
  return db.prisma;
}

export async function listOsintInvestigations(limit = 25): Promise<OsintInvestigationListItem[]> {
  const prisma = await getRequiredOsintPrisma();
  const cases = await prisma.case.findMany({
    where: { sourceLedgerEntries: { some: {} } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      collectionJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { sourceLedgerEntries: true, evidences: true } },
    },
  });

  return cases.map((item) => ({
    caseId: item.id,
    target: maskSensitiveTarget(item.targetName),
    status: item.status,
    createdAt: item.createdAt,
    latestCollectionJob: item.collectionJobs[0]
      ? {
          id: item.collectionJobs[0].id,
          status: item.collectionJobs[0].status,
          createdAt: item.collectionJobs[0].createdAt,
          completedAt: item.collectionJobs[0].completedAt,
        }
      : null,
    sourceCount: item._count.sourceLedgerEntries,
    evidenceCount: item._count.evidences,
  }));
}

export async function getOsintInvestigationDetail(caseId: string): Promise<OsintInvestigationDetail | null> {
  const prisma = await getRequiredOsintPrisma();
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      collectionJobs: { orderBy: { createdAt: 'desc' } },
      sourceLedgerEntries: {
        orderBy: { createdAt: 'asc' },
        include: { extractedDocument: true },
      },
      evidences: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!caseRecord) return null;

  const ledger: OsintLedgerEntry[] = caseRecord.sourceLedgerEntries.map((entry) => ({
    url: entry.originalUrl,
    finalUrl: entry.finalUrl ?? undefined,
    normalizedUrl: entry.normalizedUrl,
    title: entry.title ?? undefined,
    snippet: entry.snippet ?? undefined,
    engine: entry.engine ?? undefined,
    query: entry.query ?? undefined,
    status: entry.fetchStatus as OsintLedgerEntry['status'],
    reason: entry.fetchError ?? undefined,
    fetchedAt: entry.accessedAt ?? entry.createdAt,
    httpStatus: entry.statusCode ?? undefined,
    contentType: entry.contentType ?? undefined,
    contentHash: entry.contentHash ?? undefined,
  }));

  const documents: OsintExtractedDocument[] = caseRecord.sourceLedgerEntries
    .filter((entry) => entry.extractedDocument)
    .map((entry) => ({
      url: entry.originalUrl,
      finalUrl: entry.finalUrl ?? entry.originalUrl,
      title: entry.extractedDocument!.title,
      description: entry.extractedDocument!.description ?? '',
      headings: entry.extractedDocument!.headings,
      text: entry.extractedDocument!.excerpt,
      textHash: entry.extractedDocument!.textHash,
      excerpt: entry.extractedDocument!.excerpt,
      fetchedAt: entry.extractedDocument!.extractedAt,
      status: entry.statusCode ?? 200,
    }));

  const evidenceCandidates: OsintEvidenceCandidate[] = caseRecord.evidences.map((evidence) => ({
    id: evidence.id,
    title: evidence.title,
    sourceUrl: evidence.sourceUrl ?? '',
    excerpt: evidence.relevantExcerpt ?? evidence.summary ?? '',
    confidence: evidence.confidence,
    reason: evidence.summary ?? 'Evidência persistida a partir do pipeline OSINT público.',
    collectedAt: evidence.accessedAt,
  }));
  const queries = [...new Set(ledger.map((entry) => entry.query).filter((query): query is string => Boolean(query)))];
  const limitations = [
    'Leitura de histórico: nenhuma nova coleta foi executada neste endpoint.',
    'Evidências são candidatas e requerem revisão humana antes de qualquer decisão.',
  ];
  const reportMarkdown = generateMarkdownReport({
    target: maskSensitiveTarget(caseRecord.targetName),
    generatedAt: caseRecord.updatedAt,
    caseId: caseRecord.id,
    collectionJobId: caseRecord.collectionJobs[0]?.id,
    queries,
    documents,
    evidenceCandidates,
    ledger,
    limitations,
  });

  return {
    case: {
      id: caseRecord.id,
      caseName: caseRecord.caseName,
      targetName: maskSensitiveTarget(caseRecord.targetName),
      status: caseRecord.status,
      createdAt: caseRecord.createdAt,
      updatedAt: caseRecord.updatedAt,
    },
    collectionJobs: caseRecord.collectionJobs.map((job) => ({
      id: job.id,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    })),
    ledger,
    documents,
    evidenceCandidates,
    reportMarkdown,
    limitations,
  };
}
