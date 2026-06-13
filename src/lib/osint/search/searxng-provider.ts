import type { OsintSearchResult } from '@/lib/osint/types';

interface SearxngResultItem {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  engine?: unknown;
}

interface SearxngResponse {
  results?: unknown;
}

export interface SearxngSearchOptions {
  baseUrl?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function searchSearxng(query: string, options: SearxngSearchOptions = {}): Promise<OsintSearchResult[]> {
  const baseUrl = options.baseUrl ?? process.env.SEARXNG_BASE_URL;
  if (!baseUrl) return [];

  const endpoint = new URL('/search', baseUrl);
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('format', 'json');

  const response = await (options.fetchImpl ?? fetch)(endpoint.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`SearXNG respondeu com HTTP ${response.status}`);
  }

  const payload = await response.json() as SearxngResponse;
  const items = Array.isArray(payload.results) ? payload.results : [];
  const limit = options.limit ?? 10;

  return items.slice(0, limit).map((item, index) => {
    const result = item as SearxngResultItem;
    return {
      title: asString(result.title) || 'Resultado sem título',
      url: asString(result.url),
      snippet: asString(result.content),
      engine: asString(result.engine) || undefined,
      query,
      rank: index + 1,
    };
  }).filter((item) => item.url);
}
