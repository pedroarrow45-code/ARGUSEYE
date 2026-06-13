import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as nameResolutionGET } from '@/app/api/debug/name-resolution/route';
import { GET as casesGET } from '@/app/api/cases/route';

const envBackup = { ...process.env };

async function jsonFrom(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function request(url: string): Request {
  return new Request(url);
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...envBackup };
});

afterEach(() => {
  process.env = { ...envBackup };
});

describe('GET /api/debug/name-resolution', () => {
  it('name ausente retorna 400', async () => {
    const response = await nameResolutionGET(request('http://localhost/api/debug/name-resolution'));
    const body = await jsonFrom(response);

    expect(response.status).toBe(400);
    expect(body.diagnosticStatus).toBe('INVALID_INPUT');
    expect(String(body.error)).toContain('name');
  });

  it('CPF/CNPJ como input retorna erro controlado', async () => {
    const cpfResponse = await nameResolutionGET(request('http://localhost/api/debug/name-resolution?name=123.456.789-09&targetType=PERSON'));
    const cnpjResponse = await nameResolutionGET(request('http://localhost/api/debug/name-resolution?name=11.222.333/0001-81&targetType=COMPANY'));
    const cpfBody = await jsonFrom(cpfResponse);
    const cnpjBody = await jsonFrom(cnpjResponse);

    expect(cpfResponse.status).toBe(400);
    expect(cnpjResponse.status).toBe(400);
    expect(cpfBody.diagnosticStatus).toBe('INVALID_INPUT');
    expect(cnpjBody.diagnosticStatus).toBe('INVALID_INPUT');
    expect(String(cpfBody.error)).toContain('apenas para resolução por nome');
  });

  it('WIKIDATA_ENABLED=false não chama fetch', async () => {
    process.env.WIKIDATA_ENABLED = 'false';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const response = await nameResolutionGET(request('http://localhost/api/debug/name-resolution?name=Maria%20Silva&targetType=PERSON'));
    const body = await jsonFrom(response);

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body.diagnosticStatus).toBe('WIKIDATA_DISABLED');
    expect(body.candidates).toEqual([]);
  });

  it('sucesso retorna candidatos com URL de fonte', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q123', label: 'Argus Eye Tecnologia', description: 'empresa brasileira', concepturi: 'https://www.wikidata.org/entity/Q123' }],
      }),
    }));

    const response = await nameResolutionGET(request('http://localhost/api/debug/name-resolution?name=Argus%20Eye%20Tecnologia&targetType=COMPANY&limit=2'));
    const body = await jsonFrom(response);
    const candidates = body.candidates as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(body.diagnosticStatus).toBe('CANDIDATES_FOUND');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sourceName).toBe('Wikidata');
    expect(candidates[0].sourceUrl).toBe('https://www.wikidata.org/entity/Q123');
  });

  it('timeout/falha retorna SOURCE_ERROR controlado', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    const timeoutError = new Error('aborted');
    timeoutError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    const response = await nameResolutionGET(request('http://localhost/api/debug/name-resolution?name=Maria%20Silva&targetType=PERSON'));
    const body = await jsonFrom(response);

    expect(response.status).toBe(200);
    expect(body.diagnosticStatus).toBe('SOURCE_ERROR');
    expect(body.candidates).toEqual([]);
  });

  it('documentNormalized não aparece no JSON público', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q42', label: 'Maria Fernanda Silva Costa', description: 'pessoa brasileira', concepturi: 'https://www.wikidata.org/entity/Q42' }],
      }),
    }));

    const response = await nameResolutionGET(request('http://localhost/api/debug/name-resolution?name=Maria%20Fernanda%20Silva%20Costa&targetType=PERSON'));
    const serialized = JSON.stringify(await jsonFrom(response));

    expect(serialized).not.toContain('documentNormalized');
  });

  it('endpoint não cria evidence nem altera /api/cases', async () => {
    process.env.DEMO_MODE = 'false';
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q123', label: 'Argus Eye Tecnologia', description: 'empresa brasileira', concepturi: 'https://www.wikidata.org/entity/Q123' }],
      }),
    }));

    const beforeCases = await casesGET();
    const before = await beforeCases.json() as unknown[];
    const response = await nameResolutionGET(request('http://localhost/api/debug/name-resolution?name=Argus%20Eye%20Tecnologia&targetType=COMPANY'));
    const body = await jsonFrom(response);
    const afterCases = await casesGET();
    const after = await afterCases.json() as unknown[];

    expect('evidences' in body).toBe(false);
    expect('entities' in body).toBe(false);
    expect(after).toHaveLength(before.length);
  });
});
