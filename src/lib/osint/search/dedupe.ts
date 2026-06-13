import type { OsintSearchResult } from '@/lib/osint/types';

export function normalizePublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    for (const param of [...url.searchParams.keys()]) {
      if (param.toLowerCase().startsWith('utm_') || ['fbclid', 'gclid'].includes(param.toLowerCase())) {
        url.searchParams.delete(param);
      }
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return null;
  }
}

export function dedupeSearchResults(results: OsintSearchResult[]): OsintSearchResult[] {
  const seen = new Set<string>();
  const deduped: OsintSearchResult[] = [];

  for (const result of results) {
    const canonical = normalizePublicUrl(result.url);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    deduped.push(result);
  }

  return deduped;
}

export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
