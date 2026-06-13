import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleCustomSearchProvider } from '@/lib/connectors/googleCustomSearchProvider';
import { PersonWebSearchOrchestrator } from '@/lib/person-web-search';
import { POST as resolveTargetPOST } from '@/app/api/resolve-target/route';

const envBackup = { ...process.env };

function googleResponse(items: Array<{ title: string; link: string; snippet: string }>) {
  return { ok: true, status: 200, json: async () => ({ items }) };
}

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/resolve-target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...envBackup };
});

afterEach(() => {
  process.env = { ...envBackup };
});

describe('GoogleCustomSearchProvider', () => {
  it('Google desabilitado não chama fetch', async () => {
    process.env.GOOGLE_SEARCH_ENABLED = 'false';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await new GoogleCustomSearchProvider().search('"Maria Silva"', 3, 1000);

    expect(result.status).toBe('SOURCE_DISABLED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Google sem API key/CX retorna SOURCE_DISABLED', async () => {
    process.env.GOOGLE_SEARCH_ENABLED = 'true';
    delete process.env.GOOGLE_SEARCH_API_KEY;
    delete process.env.GOOGLE_SEARCH_CX;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await new GoogleCustomSearchProvider().search('"Maria Silva"', 3, 1000);

    expect(result.status).toBe('SOURCE_DISABLED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Google habilitado chama fetch server-side sem expor key em payload público', async () => {
    process.env.GOOGLE_SEARCH_ENABLED = 'true';
    process.env.GOOGLE_SEARCH_API_KEY = 'secret-key';
    process.env.GOOGLE_SEARCH_CX = 'cx-id';
    const fetchSpy = vi.fn().mockResolvedValue(googleResponse([
      { title: 'Maria Silva - Perfil público', link: 'https://example.org/maria-silva', snippet: 'Perfil público de Maria Silva' },
    ]));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await new GoogleCustomSearchProvider().search('"Maria Silva"', 3, 1000);

    expect(result.status).toBe('READY');
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(String(fetchSpy.mock.calls[0][0])).toContain('https://www.googleapis.com/customsearch/v1');
    expect(JSON.stringify(result)).not.toContain('secret-key');
    expect(result.results[0].domain).toBe('example.org');
  });

  it('timeout retorna SOURCE_ERROR', async () => {
    process.env.GOOGLE_SEARCH_ENABLED = 'true';
    process.env.GOOGLE_SEARCH_API_KEY = 'secret-key';
    process.env.GOOGLE_SEARCH_CX = 'cx-id';
    const timeoutError = new Error('aborted');
    timeoutError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    const result = await new GoogleCustomSearchProvider().search('"Maria Silva"', 3, 1000);

    expect(result.status).toBe('SOURCE_ERROR');
    expect(result.error).toContain('Timeout');
  });
});

describe('PersonWebSearchOrchestrator', () => {
  it('deduplica URLs, classifica resultados e nunca confirma PF', async () => {
    process.env.GOOGLE_SEARCH_ENABLED = 'true';
    process.env.GOOGLE_SEARCH_API_KEY = 'secret-key';
    process.env.GOOGLE_SEARCH_CX = 'cx-id';
    process.env.MAX_GOOGLE_QUERIES_PER_CASE = '1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(googleResponse([
      { title: 'Maria Silva - Perfil público', link: 'https://example.org/maria-silva?x=1', snippet: 'Perfil público de Maria Silva' },
      { title: 'Maria Silva - Perfil público duplicado', link: 'https://example.org/maria-silva?x=2', snippet: 'Perfil público de Maria Silva' },
      { title: 'Maria Silva notícia', link: 'https://g1.globo.com/politica/maria-silva', snippet: 'Notícia com Maria Silva' },
    ])));

    const result = await new PersonWebSearchOrchestrator().search({ name: 'Maria Silva', limit: 5 });

    expect(result.status).toBe('READY');
    expect(result.results).toHaveLength(2);
    expect(result.results.map((item) => item.classification)).toContain('NEWS');
    expect(result.candidates[0].status).not.toBe('CONFIRMED');
    expect(result.candidates[0].publicResults?.[0].snippet).toContain('Maria Silva');
  });

  it('limite interno excedido é sinalizado por quota guard', async () => {
    process.env.GOOGLE_SEARCH_ENABLED = 'true';
    process.env.GOOGLE_SEARCH_API_KEY = 'secret-key';
    process.env.GOOGLE_SEARCH_CX = 'cx-id';
    process.env.MAX_GOOGLE_QUERIES_PER_CASE = '1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(googleResponse([])));

    const result = await new PersonWebSearchOrchestrator().search({ name: 'Maria Silva', context: 'contexto adicional', limit: 10 });

    expect(result.queryPlan.quotaGuardTriggered).toBe(true);
  });
});

describe('resolve-target person Google integration', () => {
  it('/api/resolve-target usa Google para PERSON e retorna URL domínio snippet e score', async () => {
    process.env.GOOGLE_SEARCH_ENABLED = 'true';
    process.env.GOOGLE_SEARCH_API_KEY = 'secret-key';
    process.env.GOOGLE_SEARCH_CX = 'cx-id';
    process.env.MAX_GOOGLE_QUERIES_PER_CASE = '1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(googleResponse([
      { title: 'Maria Silva - Perfil público', link: 'https://example.org/maria-silva', snippet: 'Perfil público de Maria Silva sem CPF' },
    ])));

    const response = await resolveTargetPOST(postRequest({ name: 'Maria Silva', targetType: 'PERSON', limit: 3 }));
    const body = await response.json() as { status: string; candidates: Array<{ status: string; publicResults: Array<{ url: string; domain: string; snippet: string; relevanceScore: number }> }> };

    expect(response.status).toBe(200);
    expect(body.status).toBe('CANDIDATES_FOUND');
    expect(body.candidates[0].status).not.toBe('CONFIRMED');
    expect(body.candidates[0].publicResults[0].url).toBe('https://example.org/maria-silva');
    expect(body.candidates[0].publicResults[0].domain).toBe('example.org');
    expect(body.candidates[0].publicResults[0].snippet).toContain('Maria Silva');
    expect(body.candidates[0].publicResults[0].relevanceScore).toBeGreaterThan(0);
  });
});
