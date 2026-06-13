import { describe, expect, it } from 'vitest';
import { dedupeSearchResults, isPublicHttpUrl } from '@/lib/osint/search/dedupe';
import type { OsintSearchResult } from '@/lib/osint/types';

function result(url: string, rank: number): OsintSearchResult {
  return { title: `r${rank}`, url, snippet: '', query: 'q', rank };
}

describe('dedupeSearchResults', () => {
  it('remove duplicatas por URL canônica e ignora protocolos não públicos', () => {
    const results = dedupeSearchResults([
      result('https://www.example.com/page?utm_source=x#frag', 1),
      result('https://example.com/page', 2),
      result('file:///tmp/private', 3),
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].rank).toBe(1);
  });

  it('aceita apenas HTTP e HTTPS públicos', () => {
    expect(isPublicHttpUrl('https://example.com')).toBe(true);
    expect(isPublicHttpUrl('http://example.com')).toBe(true);
    expect(isPublicHttpUrl('ftp://example.com')).toBe(false);
    expect(isPublicHttpUrl('not-a-url')).toBe(false);
  });
});
