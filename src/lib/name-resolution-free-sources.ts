import { getMaxNameCandidatesPerCase, getWikidataTimeoutMs, isWikidataEnabled } from '@/lib/config';
import { WikidataNameResolver } from '@/lib/connectors/wikidataNameResolver';
import type { NameResolutionCandidate, NameResolutionResult, NameResolutionStatus, TargetType } from '@/lib/types';
import { normalizeCompanyName, normalizePersonName } from '@/lib/name-resolution';

export interface ResolveNameWithFreeSourcesInput {
  inputName: string;
  targetType: TargetType;
  limit?: number;
}

function normalizedForTarget(value: string, targetType: TargetType): string {
  return targetType === 'COMPANY' ? normalizeCompanyName(value) : normalizePersonName(value);
}

function withAmbiguity(candidates: NameResolutionCandidate[]): NameResolutionCandidate[] {
  const eligible = candidates.filter((candidate) => candidate.status !== 'REJECTED' && candidate.matchScore >= 55);
  if (eligible.length < 2) return candidates;

  const topScore = Math.max(...eligible.map((candidate) => candidate.matchScore));
  const closeCandidates = new Set(eligible.filter((candidate) => topScore - candidate.matchScore <= 12).map((candidate) => candidate.candidateId));
  if (closeCandidates.size < 2) return candidates;

  return candidates.map((candidate) => {
    if (!closeCandidates.has(candidate.candidateId)) return candidate;
    return {
      ...candidate,
      status: 'AMBIGUOUS' as const,
      matchSignals: [
        ...candidate.matchSignals,
        { kind: 'WIKIDATA_AMBIGUOUS_RESULTS', description: 'Múltiplos candidatos Wikidata com score próximo; confirmação automática bloqueada.', weight: -24 },
      ],
    };
  });
}

function resultStatus(candidates: NameResolutionCandidate[], targetType: TargetType): NameResolutionStatus {
  if (targetType === 'GROUP' || targetType === 'UNKNOWN') return 'UNSUPPORTED';
  if (candidates.length === 0) return 'NOT_FOUND';
  if (candidates.some((candidate) => candidate.status === 'AMBIGUOUS')) return 'AMBIGUOUS';
  if (candidates.every((candidate) => candidate.status === 'REJECTED')) return 'REJECTED';
  return 'CANDIDATE';
}

function baseResult(input: ResolveNameWithFreeSourcesInput, candidates: NameResolutionCandidate[], notes: string[], generatedAt = new Date()): NameResolutionResult {
  return {
    inputName: input.inputName,
    normalizedInputName: normalizedForTarget(input.inputName, input.targetType),
    targetType: input.targetType,
    status: resultStatus(candidates, input.targetType),
    candidates,
    generatedAt,
    notes,
  };
}

export async function resolveNameWithFreeSources(input: ResolveNameWithFreeSourcesInput): Promise<NameResolutionResult> {
  const generatedAt = new Date();

  if (input.targetType === 'GROUP' || input.targetType === 'UNKNOWN') {
    return baseResult(input, [], ['Busca name-first gratuita suportada apenas para PERSON ou COMPANY nesta fase.'], generatedAt);
  }

  if (!isWikidataEnabled()) {
    return baseResult(input, [], ['WIKIDATA_ENABLED=false. Nenhuma fonte externa gratuita foi consultada.'], generatedAt);
  }

  try {
    const limit = Math.min(input.limit ?? getMaxNameCandidatesPerCase(), getMaxNameCandidatesPerCase());
    const resolver = new WikidataNameResolver();
    const candidates = withAmbiguity(await resolver.search({
      inputName: input.inputName,
      targetType: input.targetType,
      limit,
      timeoutMs: getWikidataTimeoutMs(),
    }));

    return baseResult(input, candidates, [
      'Wikidata consultada como fonte gratuita de descoberta de candidatos por nome.',
      'Resultados permanecem como candidatos; nenhum candidato foi convertido em evidência ou entidade confirmada.',
    ], generatedAt);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Timeout ao consultar Wikidata. Nenhum candidato foi confirmado.'
      : 'Falha controlada ao consultar Wikidata. Nenhum candidato foi confirmado.';

    return baseResult(input, [], [message], generatedAt);
  }
}
