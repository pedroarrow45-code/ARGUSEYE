import { describe, expect, it, vi } from 'vitest';
import { assertPublicHttpUrl, fetchPublicHtml } from '@/lib/osint/fetcher';

const publicLookup = async () => ['93.184.216.34'];

describe('fetchPublicHtml SSRF protections', () => {
  it.each([
    'file:///tmp/secret',
    'ftp://example.com/file',
    'data:text/html,hello',
    'http://localhost/admin',
    'http://127.0.0.1/admin',
    'http://0.0.0.0/admin',
    'http://[::1]/admin',
    'http://10.0.0.1/admin',
    'http://172.16.0.1/admin',
    'http://192.168.0.1/admin',
    'http://169.254.169.254/latest/meta-data',
    'http://metadata.google.internal/computeMetadata/v1',
  ])('bloqueia URL não pública %s', async (url) => {
    await expect(assertPublicHttpUrl(url, publicLookup)).rejects.toThrow();
  });

  it('bloqueia hostname que resolve para IP privado', async () => {
    await expect(assertPublicHttpUrl('https://public.example', async () => ['10.1.2.3'])).rejects.toThrow('resolver para IP interno');
  });

  it('permite URL pública HTTP/HTTPS com resolvedor público', async () => {
    await expect(assertPublicHttpUrl('https://example.com/page', publicLookup)).resolves.toBeInstanceOf(URL);
  });

  it('busca HTML público com timeout, content-type e limite de tamanho', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html><body>conteúdo público suficiente para teste de fetch seguro</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }));

    const result = await fetchPublicHtml('https://example.com/page', {
      fetchImpl: fetchMock,
      lookupHostname: publicLookup,
      timeoutMs: 1000,
      maxBytes: 10_000,
    });

    expect(result.status).toBe(200);
    expect(result.contentType).toContain('text/html');
    expect(result.html).toContain('conteúdo público');
  });

  it('rejeita conteúdo não HTML', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await expect(fetchPublicHtml('https://example.com/api', {
      fetchImpl: fetchMock,
      lookupHostname: publicLookup,
    })).rejects.toThrow('não ser HTML');
  });
});
