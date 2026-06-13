import { getGoogleSearchTimeoutMs, getMaxGoogleQueriesPerCase, getMaxWebResultsPerCase } from '@/lib/config';
import { GoogleCustomSearchProvider } from '@/lib/connectors/googleCustomSearchProvider';
import { normalizePersonName, tokenizeName } from '@/lib/name-resolution';
import type { MatchSignal, NameResolutionCandidate, SearchQueryPlan, WebSearchProviderResponse, WebSearchResult, WebSearchResultClassification } from '@/lib/types';

export interface PersonWebSearchInput {
  name: string;
  context?: string;
  limit?: number;
}

export interface PersonWebSearchResponse {
  status: WebSearchProviderResponse['status'];
  candidates: NameResolutionCandidate[];
  results: WebSearchResult[];
  queryPlan: SearchQueryPlan;
  notes: string[];
}

const STRONG_CLASSIFICATIONS = new Set<WebSearchResultClassification>(['PUBLIC_PROFILE', 'INSTITUTIONAL_PAGE', 'NEWS', 'PUBLIC_DOCUMENT']);

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function buildQueryPlan(input: PersonWebSearchInput): SearchQueryPlan {
  const maxQueries = getMaxGoogleQueriesPerCase();
  const maxConfiguredResults = getMaxWebResultsPerCase();
  const requestedResults = input.limit ?? maxConfiguredResults;
  const maxResults = Math.min(requestedResults, maxConfiguredResults);
  const context = input.context?.trim();
  const baseQueries = [
    `"${input.name}"`,
    context ? `"${input.name}" ${context.split(/\s+/).slice(0, 4).join(' ')}` : '',
  ].filter(Boolean);
  const queries = unique(baseQueries).slice(0, maxQueries);

  return {
    queries,
    maxQueries,
    maxResults,
    quotaGuardTriggered: unique(baseQueries).length > maxQueries || requestedResults > maxConfiguredResults,
  };
}

function nameCoverage(name: string, result: WebSearchResult): number {
  const nameTokens = tokenizeName(name).filter((token) => token.length > 1);
  const haystack = normalizePersonName(`${result.title} ${result.snippet}`);
  const overlap = nameTokens.filter((token) => haystack.includes(token)).length;
  return nameTokens.length > 0 ? overlap / nameTokens.length : 0;
}

function resultScore(name: string, result: WebSearchResult): number {
  const coverage = nameCoverage(name, result);
  const classificationBoost = STRONG_CLASSIFICATIONS.has(result.classification) ? 18 : result.classification === 'PUBLIC_SOCIAL_NETWORK' ? 10 : 0;
  const rankPenalty = Math.max(0, result.rawRank - 1) * 2;
  const homonymPenalty = coverage < 1 ? 18 : 0;
  return Math.max(0, Math.min(100, Math.round(coverage * 78 + classificationBoost - rankPenalty - homonymPenalty)));
}

function dedupeResults(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = result.url.replace(/[#?].*$/, '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resultSignals(results: WebSearchResult[]): MatchSignal[] {
  const domains = unique(results.map((result) => result.domain)).slice(0, 5);
  return [
    { kind: 'WEB_SEARCH_RESULT_CLUSTER', description: `Resultados públicos agrupados por busca web. Domínios: ${domains.join(', ')}.`, weight: 0 },
    { kind: 'PERSON_NOT_CONFIRMED', description: 'Pessoa Física não é confirmada automaticamente por busca web; requer revisão humana.', weight: -40 },
  ];
}

function candidateFromResults(input: PersonWebSearchInput, results: WebSearchResult[]): NameResolutionCandidate[] {
  const useful = results.filter((result) => result.classification !== 'IRRELEVANT' && result.relevanceScore >= 35);
  if (useful.length === 0) return [];
  const maxScore = Math.max(...useful.map((result) => result.relevanceScore));
  const closeDomains = unique(useful.filter((result) => maxScore - result.relevanceScore <= 15).map((result) => result.domain));
  const status = closeDomains.length > 1 ? 'AMBIGUOUS' : 'CANDIDATE';

  return [{
    candidateId: `google-person-${normalizePersonName(input.name).replace(/\s+/g, '-') || 'candidate'}-1`,
    inputName: input.name,
    displayName: input.name,
    normalizedName: normalizePersonName(input.name),
    targetType: 'PERSON',
    sourceName: 'Google Custom Search',
    sourceUrl: useful[0].url,
    matchScore: maxScore,
    matchSignals: status === 'AMBIGUOUS'
      ? [...resultSignals(useful), { kind: 'POSSIBLE_HOMONYM', description: 'Múltiplos domínios relevantes podem representar homônimos; não agrupar como identidade única.', weight: -30 }]
      : resultSignals(useful),
    confidence: maxScore >= 75 ? 'HIGH' : maxScore >= 55 ? 'MEDIUM' : 'LOW',
    status,
    collectedAt: new Date(),
    publicResults: useful,
  }];
}

export class PersonWebSearchOrchestrator {
  async search(input: PersonWebSearchInput): Promise<PersonWebSearchResponse> {
    const queryPlan = buildQueryPlan(input);

    if (queryPlan.maxQueries <= 0 || queryPlan.maxResults <= 0 || queryPlan.quotaGuardTriggered) {
      return { status: 'QUOTA_GUARD_TRIGGERED', candidates: [], results: [], queryPlan, notes: ['QUOTA_GUARD_TRIGGERED: limite interno de cota impediu ou reduziu consulta web.'] };
    }

    const provider = new GoogleCustomSearchProvider();
    const perQueryLimit = Math.max(1, Math.ceil(queryPlan.maxResults / Math.max(queryPlan.queries.length, 1)));
    const responses = [];

    for (const query of queryPlan.queries) {
      responses.push(await provider.search(query, perQueryLimit, getGoogleSearchTimeoutMs()));
    }

    const disabled = responses.find((response) => response.status === 'SOURCE_DISABLED');
    if (disabled) return { status: 'SOURCE_DISABLED', candidates: [], results: [], queryPlan, notes: ['Google Custom Search não configurado; busca web ampla para Pessoa Física não foi executada.'] };

    const sourceError = responses.find((response) => response.status === 'SOURCE_ERROR');
    if (sourceError && responses.every((response) => response.results.length === 0)) {
      return { status: 'SOURCE_ERROR', candidates: [], results: [], queryPlan, notes: [sourceError.error ?? 'Falha controlada na busca web.'] };
    }

    const allResults = dedupeResults(responses.flatMap((response) => response.results))
      .map((result) => {
        const relevanceScore = resultScore(input.name, result);
        return {
          ...result,
          relevanceScore,
          classification: nameCoverage(input.name, result) < 1 && relevanceScore >= 25 ? 'POSSIBLE_HOMONYM' as const : result.classification,
        };
      })
      .filter((result) => result.relevanceScore >= 25)
      .slice(0, queryPlan.maxResults);
    const candidates = candidateFromResults(input, allResults);

    return {
      status: candidates.length > 0 ? 'READY' : 'SOURCE_ERROR',
      candidates,
      results: allResults,
      queryPlan,
      notes: [
        'Google Custom Search consultado server-side para descoberta de referências públicas de Pessoa Física.',
        'Resultados públicos podem envolver homônimos. Revise as fontes antes de criar um case.',
      ],
    };
  }
}
