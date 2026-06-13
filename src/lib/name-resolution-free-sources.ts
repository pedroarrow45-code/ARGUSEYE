import { getMaxNameCandidatesPerCase, getWikidataTimeoutMs, isWikidataEnabled } from '@/lib/config';
import { WikidataNameResolver } from '@/lib/connectors/wikidataNameResolver';
import { PersonWebSearchOrchestrator } from '@/lib/person-web-search';
import type { NameResolutionCandidate, NameResolutionResult, NameResolutionStatus, TargetType } from '@/lib/types';
import { normalizeCompanyName, normalizePersonName } from '@/lib/name-resolution';

export interface ResolveNameWithFreeSourcesInput {
  inputName: string;
  targetType: TargetType;
  context?: string;
  limit?: number;
}

function normalizedForTarget(value: string, targetType: TargetType): string {
  return targetType === 'COMPANY' ? normalizeCompanyName(value) : normalizePersonName(value);
}

function withAmbiguity(candidates: NameResolutionCandidate[], signalPrefix = 'WIKIDATA'): NameResolutionCandidate[] {
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
        { kind: `${signalPrefix}_AMBIGUOUS_RESULTS`, description: 'Múltiplos candidatos com score próximo; confirmação automática bloqueada.', weight: -24 },
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

async function resolvePerson(input: ResolveNameWithFreeSourcesInput, generatedAt: Date): Promise<NameResolutionResult> {
  const limit = Math.min(input.limit ?? getMaxNameCandidatesPerCase(), getMaxNameCandidatesPerCase());
  const web = await new PersonWebSearchOrchestrator().search({ name: input.inputName, context: input.context, limit });

  if (web.status === 'READY') {
    const candidates = withAmbiguity(web.candidates, 'WEB_SEARCH');
    const notes = [
      ...web.notes,
      web.queryPlan.quotaGuardTriggered ? 'QUOTA_GUARD_TRIGGERED: limite interno reduziu consultas/resultados para proteger cota.' : 'Limites internos de cota aplicados à busca web.',
    ];

    if (isWikidataEnabled() && candidates.length < limit) {
      try {
        const wikidata = await new WikidataNameResolver().search({ inputName: input.inputName, targetType: 'PERSON', limit: Math.max(1, limit - candidates.length), timeoutMs: getWikidataTimeoutMs() });
        return baseResult(input, withAmbiguity([...candidates, ...wikidata], 'PERSON'), [...notes, 'Wikidata consultada como fonte auxiliar para Pessoa Física.'], generatedAt);
      } catch {
        return baseResult(input, candidates, [...notes, 'Wikidata auxiliar falhou sem confirmar identidade.'], generatedAt);
      }
    }

    return baseResult(input, candidates, notes, generatedAt);
  }

  if (web.status === 'SOURCE_DISABLED' && isWikidataEnabled()) {
    try {
      const wikidata = withAmbiguity(await new WikidataNameResolver().search({ inputName: input.inputName, targetType: 'PERSON', limit, timeoutMs: getWikidataTimeoutMs() }));
      return baseResult(input, wikidata, ['Google Custom Search não configurado; fallback honesto para Wikidata como fonte auxiliar limitada.', 'Pessoa Física não é confirmada por nome.'], generatedAt);
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Timeout ao consultar Wikidata. Nenhum candidato foi confirmado.'
        : 'SOURCE_ERROR: falha controlada na busca auxiliar Wikidata.';
      return baseResult(input, [], [message], generatedAt);
    }
  }

  if (web.status === 'QUOTA_GUARD_TRIGGERED') {
    return baseResult(input, [], ['QUOTA_GUARD_TRIGGERED: limite interno impediu consulta web para proteger cota.'], generatedAt);
  }

  return baseResult(input, [], web.status === 'SOURCE_DISABLED' ? [...web.notes, 'WIKIDATA_ENABLED=false. Nenhuma fonte auxiliar foi consultada.'] : web.notes.length > 0 ? web.notes : ['SOURCE_ERROR: falha controlada na busca web de Pessoa Física.'], generatedAt);
}

async function resolveCompany(input: ResolveNameWithFreeSourcesInput, generatedAt: Date): Promise<NameResolutionResult> {
  if (!isWikidataEnabled()) {
    return baseResult(input, [], ['WIKIDATA_ENABLED=false. Nenhuma fonte externa gratuita foi consultada.'], generatedAt);
  }

  try {
    const limit = Math.min(input.limit ?? getMaxNameCandidatesPerCase(), getMaxNameCandidatesPerCase());
    const candidates = withAmbiguity(await new WikidataNameResolver().search({
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

export async function resolveNameWithFreeSources(input: ResolveNameWithFreeSourcesInput): Promise<NameResolutionResult> {
  const generatedAt = new Date();

  if (input.targetType === 'GROUP' || input.targetType === 'UNKNOWN') {
    return baseResult(input, [], ['Busca name-first gratuita suportada apenas para PERSON ou COMPANY nesta fase.'], generatedAt);
  }

  if (input.targetType === 'PERSON') {
    return resolvePerson(input, generatedAt);
  }

  return resolveCompany(input, generatedAt);
}
