import { hasGoogleSearchCredentials, isGoogleSearchEnabled } from '@/lib/config';
import type { WebSearchProvider, WebSearchProviderResponse, WebSearchResult, WebSearchResultClassification } from '@/lib/types';

const GOOGLE_CUSTOM_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';
const DOCUMENT_PATTERN = /(?<!\d)(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})(?!\d)/g;

interface GoogleSearchItem {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
}

interface GoogleSearchResponse {
  items?: unknown;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function redactDocuments(value: string): string {
  DOCUMENT_PATTERN.lastIndex = 0;
  return value.replace(DOCUMENT_PATTERN, '[documento removido]');
}

function containsDocument(value: string): boolean {
  DOCUMENT_PATTERN.lastIndex = 0;
  const found = DOCUMENT_PATTERN.test(value);
  DOCUMENT_PATTERN.lastIndex = 0;
  return found;
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function classifyResult(url: string, title: string): WebSearchResultClassification {
  const domain = domainFromUrl(url);
  const lower = `${url} ${title}`.toLowerCase();
  if (!domain) return 'IRRELEVANT';
  if (/\.pdf($|[?#])/.test(lower)) return 'PUBLIC_DOCUMENT';
  if (['linkedin.com', 'lattes.cnpq.br', 'escavador.com', 'jusbrasil.com.br'].some((item) => domain.includes(item))) return 'PUBLIC_PROFILE';
  if (['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'youtube.com'].some((item) => domain.includes(item))) return 'PUBLIC_SOCIAL_NETWORK';
  if (['g1.globo.com', 'folha.uol.com.br', 'estadao.com.br', 'uol.com.br', 'cnnbrasil.com.br'].some((item) => domain.includes(item))) return 'NEWS';
  if (domain.endsWith('.gov.br') || domain.endsWith('.edu.br') || domain.includes('jus.br')) return 'INSTITUTIONAL_PAGE';
  return 'GENERIC_RESULT';
}

export class GoogleCustomSearchProvider implements WebSearchProvider {
  name = 'Google Custom Search';

  async search(query: string, limit: number, timeoutMs: number): Promise<WebSearchProviderResponse> {
    if (!isGoogleSearchEnabled() || !hasGoogleSearchCredentials()) {
      return { status: 'SOURCE_DISABLED', results: [], error: 'Google Custom Search não configurado.' };
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;
    const num = Math.max(1, Math.min(limit, 10));
    const params = new URLSearchParams({ key: apiKey!, cx: cx!, q: query, num: String(num) });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const collectedAt = new Date();

    try {
      const response = await fetch(`${GOOGLE_CUSTOM_SEARCH_URL}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        return { status: 'SOURCE_ERROR', results: [], error: `Google Custom Search retornou HTTP ${response.status}` };
      }

      const payload = await response.json() as GoogleSearchResponse;
      const items = Array.isArray(payload.items) ? payload.items : [];
      const results: WebSearchResult[] = items.flatMap((item, index) => {
        const raw = item as GoogleSearchItem;
        const url = asString(raw.link);
        const title = redactDocuments(asString(raw.title).trim());
        const snippet = redactDocuments(asString(raw.snippet).trim());
        const domain = domainFromUrl(url);
        if (!url || containsDocument(url) || !domain || !title) return [];
        return [{
          title,
          url,
          domain,
          snippet,
          sourceProvider: this.name,
          queryUsed: query,
          rawRank: index + 1,
          relevanceScore: 0,
          collectedAt,
          classification: classifyResult(url, title),
        }];
      });

      return { status: 'READY', results };
    } catch (error) {
      return {
        status: 'SOURCE_ERROR',
        results: [],
        error: error instanceof Error && error.name === 'AbortError' ? 'Timeout ao consultar Google Custom Search.' : 'Falha ao consultar Google Custom Search.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
