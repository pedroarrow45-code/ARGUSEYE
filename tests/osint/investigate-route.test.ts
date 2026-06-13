import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/osint/investigate/route';

const envBackup = { ...process.env };

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/osint/investigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...envBackup, SEARXNG_BASE_URL: 'http://searxng.local' };
});

afterEach(() => {
  process.env = { ...envBackup };
  vi.unstubAllGlobals();
});

describe('POST /api/osint/investigate', () => {
  it('valida target obrigatório', async () => {
    const response = await POST(postRequest({ target: '' }));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(String(body.error)).toContain('Too small');
  });



  it('mascara CPF no alvo, queries e relatório', async () => {
    process.env.SEARXNG_BASE_URL = '';

    const response = await POST(postRequest({ target: '123.456.789-09' }));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.target).toBe('***.***.***-09');
    expect(JSON.stringify(body)).not.toContain('123.456.789-09');
  });

  it('executa pipeline com SearXNG e fetch HTML mockados', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.startsWith('http://searxng.local/search')) {
        return new Response(JSON.stringify({
          results: [
            { title: 'Argus Eye fonte pública', url: 'https://93.184.216.34/fonte?utm_source=x', content: 'Argus Eye em fonte pública', engine: 'mock' },
            { title: 'Duplicado', url: 'https://93.184.216.34/fonte', content: 'duplicado', engine: 'mock' },
            { title: 'Privado', url: 'ftp://93.184.216.34/private', content: 'privado', engine: 'mock' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      return new Response('<html><head><title>Argus Eye fonte pública</title><meta name="description" content="Fonte pública de teste"></head><body><h1>Argus Eye LTDA</h1><p>Conteúdo público coletado com detalhes suficientes para validar extração, geração de evidência candidata e relatório Markdown sem internet real.</p></body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }));

    const response = await POST(postRequest({ target: 'Argus Eye LTDA' }));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.target).toBe('Argus Eye LTDA');
    expect(body.queries).toEqual(expect.arrayContaining(['"Argus Eye LTDA"']));
    expect(body.documents).toHaveLength(1);
    expect(body.evidenceCandidates).toHaveLength(1);
    expect(body.persisted).toBe(false);
    expect(body.counts).toMatchObject({ documents: 1, evidenceCandidates: 1 });
    expect(String(body.reportMarkdown)).toContain('Relatório OSINT público');
  });
});
