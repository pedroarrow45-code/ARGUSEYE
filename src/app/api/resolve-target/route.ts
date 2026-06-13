import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getMaxNameCandidatesPerCase } from '@/lib/config';
import { detectInputType } from '@/lib/compliance';
import { resolveNameWithFreeSources } from '@/lib/name-resolution-free-sources';
import type { MatchSignal, NameResolutionCandidate, NameResolutionResult, TargetType } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ResolveTargetStatus = 'CANDIDATES_FOUND' | 'AMBIGUOUS' | 'NOT_FOUND' | 'UNSUPPORTED' | 'SOURCE_DISABLED' | 'SOURCE_ERROR' | 'QUOTA_GUARD_TRIGGERED' | 'INVALID_INPUT';

type SafeResolvedCandidate = {
  candidateId: string;
  displayName: string;
  normalizedName: string;
  targetType: TargetType;
  sourceName: string;
  sourceUrl: string | null;
  matchScore: number;
  matchSignals: MatchSignal[];
  confidence: NameResolutionCandidate['confidence'];
  status: NameResolutionCandidate['status'];
  collectedAt: Date;
  documentMasked?: string;
  publicResults?: NameResolutionCandidate['publicResults'];
};

type ResolveTargetRequestBody = {
  name?: unknown;
  targetType?: unknown;
  context?: unknown;
  limit?: unknown;
};

const ALLOWED_TARGET_TYPES = new Set<TargetType>(['PERSON', 'COMPANY', 'UNKNOWN']);

function normalizeTargetType(value: unknown): TargetType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return ALLOWED_TARGET_TYPES.has(normalized as TargetType) ? normalized as TargetType : null;
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.floor(parsed), getMaxNameCandidatesPerCase());
}

function safeCandidate(candidate: NameResolutionCandidate): SafeResolvedCandidate {
  return {
    candidateId: candidate.candidateId,
    displayName: candidate.displayName,
    normalizedName: candidate.normalizedName,
    targetType: candidate.targetType,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    matchScore: candidate.matchScore,
    matchSignals: candidate.matchSignals,
    confidence: candidate.confidence,
    status: candidate.status,
    collectedAt: candidate.collectedAt,
    ...(candidate.documentMasked ? { documentMasked: candidate.documentMasked } : {}),
    ...(candidate.publicResults ? { publicResults: candidate.publicResults } : {}),
  };
}

function toResolveTargetStatus(result: NameResolutionResult): ResolveTargetStatus {
  const notes = result.notes.join(' ');
  if (result.status === 'UNSUPPORTED') return 'UNSUPPORTED';
  if (result.status === 'AMBIGUOUS') return 'AMBIGUOUS';
  if (result.candidates.some((candidate) => candidate.status !== 'REJECTED')) return 'CANDIDATES_FOUND';
  if (notes.includes('QUOTA_GUARD_TRIGGERED')) return 'QUOTA_GUARD_TRIGGERED';
  if (notes.includes('SOURCE_ERROR') || notes.includes('Falha controlada') || notes.includes('Timeout ao consultar')) return 'SOURCE_ERROR';
  if (notes.includes('WIKIDATA_ENABLED=false') || notes.includes('Google Custom Search não configurado')) return 'SOURCE_DISABLED';
  return 'NOT_FOUND';
}

function logResolveTarget(targetType: TargetType | 'INVALID', nameLength: number, candidateCount: number, status: ResolveTargetStatus): void {
  console.info('Resolve target requested', {
    targetType,
    nameLength,
    candidateCount,
    status,
  });
}

function invalidInput(message: string, targetType: TargetType | 'INVALID' = 'INVALID', nameLength = 0) {
  logResolveTarget(targetType, nameLength, 0, 'INVALID_INPUT');
  return NextResponse.json({
    status: 'INVALID_INPUT' satisfies ResolveTargetStatus,
    error: message,
  }, { status: 400 });
}

export async function POST(request: Request) {
  let body: ResolveTargetRequestBody;

  try {
    body = await request.json() as ResolveTargetRequestBody;
  } catch {
    return invalidInput('JSON inválido. Envie name, targetType, context opcional e limit opcional.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const targetType = normalizeTargetType(body.targetType);
  const limit = parseLimit(body.limit);

  if (!name) {
    return invalidInput('Informe o campo name para resolver candidatos por nome.', targetType ?? 'INVALID');
  }

  if (!targetType) {
    return invalidInput('targetType deve ser PERSON, COMPANY ou UNKNOWN.', 'INVALID', name.length);
  }

  const inputType = detectInputType(name);
  if (inputType === 'CPF' || inputType === 'CNPJ') {
    return invalidInput('Este endpoint resolve apenas nomes. Use fluxos específicos para CPF/CNPJ.', targetType, name.length);
  }

  try {
    const result = await resolveNameWithFreeSources({
      inputName: name,
      targetType,
      context: typeof body.context === 'string' ? body.context : undefined,
      limit,
    });
    const status = toResolveTargetStatus(result);
    const candidates = result.candidates.map(safeCandidate);

    logResolveTarget(targetType, name.length, candidates.length, status);

    return NextResponse.json({
      resolutionId: `resolution-${randomUUID()}`,
      inputName: result.inputName,
      normalizedInputName: result.normalizedInputName,
      targetType: result.targetType,
      status,
      candidates,
      notes: result.notes,
      generatedAt: result.generatedAt,
    });
  } catch {
    const status: ResolveTargetStatus = 'SOURCE_ERROR';
    logResolveTarget(targetType, name.length, 0, status);
    return NextResponse.json({
      status,
      error: 'Falha controlada ao resolver alvo por nome. Nenhum case ou evidência foi criado.',
    }, { status: 502 });
  }
}
