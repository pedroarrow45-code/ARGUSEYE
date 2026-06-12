import { compareNameSimilarity, generateNameSearchQueries, normalizeCompanyName, normalizePersonName } from '@/lib/name-resolution';
import type { CandidateConfidence, MatchSignal, NameResolutionCandidate, NameResolutionStatus, TargetType } from '@/lib/types';

const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_ENTITY_URL = 'https://www.wikidata.org/wiki';

interface WikidataSearchResult {
  id?: unknown;
  label?: unknown;
  description?: unknown;
  concepturi?: unknown;
  url?: unknown;
}

interface WikidataSearchResponse {
  search?: unknown;
}

export interface WikidataNameResolverInput {
  inputName: string;
  targetType: TargetType;
  limit: number;
  timeoutMs: number;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizedForTarget(value: string, targetType: TargetType): string {
  return targetType === 'COMPANY' ? normalizeCompanyName(value) : normalizePersonName(value);
}

function confidenceForScore(score: number): CandidateConfidence {
  if (score >= 85) return 'HIGH';
  if (score >= 55) return 'MEDIUM';
  return 'LOW';
}

function statusForScore(score: number): NameResolutionStatus {
  return score < 35 ? 'REJECTED' : 'CANDIDATE';
}

function buildWikidataUrl(search: string, limit: number): string {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search,
    language: 'pt',
    uselang: 'pt',
    type: 'item',
    limit: String(limit),
    format: 'json',
  });
  return `${WIKIDATA_API_URL}?${params.toString()}`;
}

function buildSourceUrl(id: string, conceptUri: string | null, url: string | null): string {
  if (conceptUri?.startsWith('https://')) return conceptUri;
  if (url?.startsWith('//www.wikidata.org/wiki/')) return `https:${url}`;
  if (url?.startsWith('https://www.wikidata.org/wiki/')) return url;
  return `${WIKIDATA_ENTITY_URL}/${encodeURIComponent(id)}`;
}

function addDescriptionSignal(signals: MatchSignal[], description: string | null, targetType: TargetType): MatchSignal[] {
  if (!description) return signals;
  const normalized = description.toLowerCase();
  const personHints = ['pessoa', 'político', 'politico', 'empresário', 'empresaria', 'atriz', 'ator', 'jornalista', 'cientista', 'artist'];
  const companyHints = ['empresa', 'companhia', 'organização', 'organizacao', 'sociedade', 'negócio', 'negocio', 'instituição', 'instituicao'];
  const matched = targetType === 'COMPANY'
    ? companyHints.some((hint) => normalized.includes(hint))
    : personHints.some((hint) => normalized.includes(hint));

  return matched
    ? [...signals, { kind: 'WIKIDATA_DESCRIPTION_HINT', description: 'Descrição da Wikidata contém indício compatível com o tipo de alvo informado.', weight: 6 }]
    : signals;
}

export class WikidataNameResolver {
  async search(input: WikidataNameResolverInput): Promise<NameResolutionCandidate[]> {
    if (input.targetType === 'GROUP' || input.targetType === 'UNKNOWN') return [];

    const limit = Math.max(1, Math.min(input.limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    const collectedAt = new Date();

    try {
      const [searchQuery] = generateNameSearchQueries(input.inputName, input.targetType);
      const response = await fetch(buildWikidataUrl(searchQuery ?? input.inputName, limit), {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Wikidata retornou HTTP ${response.status}`);
      }

      const payload = await response.json() as WikidataSearchResponse;
      const search = Array.isArray(payload.search) ? payload.search : [];

      return search.slice(0, limit).flatMap((item, index): NameResolutionCandidate[] => {
        const raw = item as WikidataSearchResult;
        const id = asString(raw.id);
        const label = asString(raw.label);
        if (!id || !label) return [];

        const description = asString(raw.description);
        const sourceUrl = buildSourceUrl(id, asString(raw.concepturi), asString(raw.url));
        const score = compareNameSimilarity(input.inputName, label, input.targetType);
        const matchSignals = addDescriptionSignal(score.signals, description, input.targetType);
        const adjustedScore = Math.min(100, score.score + matchSignals.filter((signal) => signal.kind === 'WIKIDATA_DESCRIPTION_HINT').reduce((sum, signal) => sum + signal.weight, 0));

        return [{
          candidateId: `wikidata-${id}-${index + 1}`,
          inputName: input.inputName,
          displayName: label,
          normalizedName: normalizedForTarget(label, input.targetType),
          targetType: input.targetType,
          sourceName: 'Wikidata',
          sourceUrl,
          matchScore: adjustedScore,
          matchSignals,
          confidence: confidenceForScore(adjustedScore),
          status: statusForScore(adjustedScore),
          collectedAt,
        }];
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
