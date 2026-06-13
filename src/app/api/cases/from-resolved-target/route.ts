import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getMaxNameCandidatesPerCase } from '@/lib/config';
import { detectInputType } from '@/lib/compliance';
import { resolveNameWithFreeSources } from '@/lib/name-resolution-free-sources';
import type { CaseDetail, DecisionType, NameResolutionCandidate, TargetType } from '@/lib/types';

export const dynamic = 'force-dynamic';

type FromResolvedTargetBody = {
  name?: unknown;
  targetType?: unknown;
  selectedCandidateId?: unknown;
  explicitUserConfirmation?: unknown;
  decisionType?: unknown;
  legitimatePurpose?: unknown;
  context?: unknown;
  limit?: unknown;
};

const DECISION_TYPES = new Set<DecisionType>(['SOCIETY', 'M_AND_A', 'CREDIT', 'LITIGATION', 'HIRING', 'PARTNERSHIP', 'INVESTMENT', 'OTHER']);
const TARGET_TYPES = new Set<TargetType>(['PERSON', 'COMPANY', 'UNKNOWN']);
const COLLECTION_MESSAGE = 'Case criado a partir de candidato selecionado em fonte pública gratuita. Nenhuma evidência cadastral confirmada foi gerada nesta etapa.';

function clean(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeTargetType(value: unknown): TargetType | null {
  const normalized = clean(value)?.toUpperCase();
  return normalized && TARGET_TYPES.has(normalized as TargetType) ? normalized as TargetType : null;
}

function normalizeDecisionType(value: unknown): DecisionType | null {
  const normalized = clean(value)?.toUpperCase();
  return normalized && DECISION_TYPES.has(normalized as DecisionType) ? normalized as DecisionType : null;
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.floor(parsed), getMaxNameCandidatesPerCase());
}

function invalidInput(message: string, status = 400) {
  return NextResponse.json({ error: message, status: 'INVALID_INPUT' }, { status });
}

function logCaseFromResolvedTarget(targetType: TargetType | 'INVALID', nameLength: number, found: boolean): void {
  console.info('Create case from resolved target requested', {
    targetType,
    nameLength,
    candidateValidated: found,
  });
}

function buildCaseFromCandidate(input: {
  candidate: NameResolutionCandidate;
  targetType: TargetType;
  decisionType: DecisionType;
  legitimatePurpose: string;
  context?: string;
}): CaseDetail {
  const now = new Date();
  const id = randomUUID();
  const targetId = `target-${id}`;
  const jobId = `job-resolved-${id}`;
  const targetType = input.targetType === 'COMPANY' ? 'COMPANY' : 'PERSON';
  const gaps = [
    'Wikidata foi usada apenas para descoberta de candidato por nome; não há evidência cadastral confirmada neste case.',
    targetType === 'PERSON'
      ? 'Pessoa Física não foi confirmada por nome. Requer revisão humana antes de qualquer decisão.'
      : 'Pessoa Jurídica selecionada por nome ainda requer validação cadastral independente antes de decisão.',
  ];

  return {
    id,
    caseName: `DUE-${now.getFullYear()}-RES-${id.slice(0, 8)}`,
    targetName: input.candidate.displayName,
    targetType,
    identifierMasked: input.candidate.documentMasked ?? null,
    decisionType: input.decisionType,
    legitimatePurpose: input.legitimatePurpose,
    context: input.context ?? null,
    sector: null,
    relatedTerms: null,
    collectionStatus: 'SEARCH_NOT_EXECUTED',
    collectionMode: 'LIVE',
    collectionMessage: COLLECTION_MESSAGE,
    sourcesConsulted: ['Wikidata'],
    registryData: null,
    gaps,
    status: 'COMPLETED',
    overallRisk: 'MEDIUM',
    recommendation: 'INVESTIGATE_FURTHER',
    createdAt: now,
    updatedAt: now,
    targets: [{
      id: targetId,
      caseId: id,
      name: input.candidate.displayName,
      type: targetType,
      documentMasked: input.candidate.documentMasked ?? null,
      sector: null,
      notes: input.context ?? 'Alvo criado a partir de candidato selecionado; identidade não confirmada automaticamente.',
      createdAt: now,
    }],
    evidences: [],
    entities: [],
    relationships: [],
    risks: [],
    collectionJobs: [{
      id: jobId,
      caseId: id,
      status: 'COMPLETED',
      startedAt: now,
      completedAt: now,
      errorMessage: null,
      mode: 'LIVE',
      createdAt: now,
      updatedAt: now,
    }],
  };
}

export async function POST(request: Request) {
  let body: FromResolvedTargetBody;

  try {
    body = await request.json() as FromResolvedTargetBody;
  } catch {
    return invalidInput('JSON inválido. Envie name, targetType, selectedCandidateId, explicitUserConfirmation, decisionType e legitimatePurpose.');
  }

  const name = clean(body.name);
  const selectedCandidateId = clean(body.selectedCandidateId);
  const targetType = normalizeTargetType(body.targetType);
  const decisionType = normalizeDecisionType(body.decisionType);
  const legitimatePurpose = clean(body.legitimatePurpose);
  const context = clean(body.context);
  const limit = parseLimit(body.limit);

  if (body.explicitUserConfirmation !== true) {
    return invalidInput('Confirmação explícita do usuário é obrigatória para criar case a partir de candidato.');
  }

  if (!name) return invalidInput('Informe name para revalidar o candidato selecionado.');
  if (!targetType || targetType === 'UNKNOWN') return invalidInput('targetType deve ser PERSON ou COMPANY para criar case a partir de candidato.');
  if (!selectedCandidateId) return invalidInput('Informe selectedCandidateId retornado por /api/resolve-target.');
  if (!decisionType) return invalidInput('decisionType inválido.');
  if (!legitimatePurpose || legitimatePurpose.length < 10) return invalidInput('legitimatePurpose deve explicar a finalidade legítima com pelo menos 10 caracteres.');

  const inputType = detectInputType(name);
  if (inputType === 'CPF' || inputType === 'CNPJ') {
    return invalidInput('Este endpoint cria case apenas a partir de candidato por nome. Use fluxos específicos para CPF/CNPJ.');
  }

  try {
    const resolution = await resolveNameWithFreeSources({ inputName: name, targetType, limit });
    const candidate = resolution.candidates.find((item) => item.candidateId === selectedCandidateId);

    if (!candidate || candidate.status === 'REJECTED') {
      logCaseFromResolvedTarget(targetType, name.length, false);
      return NextResponse.json({
        error: 'Candidato selecionado não foi encontrado na resolução revalidada ou não está apto para criação de case básico.',
        status: 'CANDIDATE_NOT_FOUND',
      }, { status: 404 });
    }

    const caseDetail = buildCaseFromCandidate({ candidate, targetType, decisionType, legitimatePurpose, context });
    logCaseFromResolvedTarget(targetType, name.length, true);

    return NextResponse.json({ id: caseDetail.id, case: caseDetail }, { status: 201 });
  } catch {
    logCaseFromResolvedTarget(targetType, name.length, false);
    return NextResponse.json({
      error: 'Falha controlada ao revalidar candidato selecionado. Nenhum case foi criado.',
      status: 'SOURCE_ERROR',
    }, { status: 502 });
  }
}
