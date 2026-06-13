import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as resolveTargetPOST } from '@/app/api/resolve-target/route';
import { GET as casesGET } from '@/app/api/cases/route';

const envBackup = { ...process.env };

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/resolve-target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function jsonFrom(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...envBackup };
});

afterEach(() => {
  process.env = { ...envBackup };
});

describe('POST /api/resolve-target', () => {
  it('name ausente retorna 400', async () => {
    const response = await resolveTargetPOST(postRequest({ targetType: 'COMPANY' }));
    const body = await jsonFrom(response);

    expect(response.status).toBe(400);
    expect(body.status).toBe('INVALID_INPUT');
    expect(String(body.error)).toContain('name');
  });

  it('CPF/CNPJ retorna INVALID_INPUT', async () => {
    const cpfResponse = await resolveTargetPOST(postRequest({ name: '123.456.789-09', targetType: 'PERSON' }));
    const cnpjResponse = await resolveTargetPOST(postRequest({ name: '11.222.333/0001-81', targetType: 'COMPANY' }));
    const cpfBody = await jsonFrom(cpfResponse);
    const cnpjBody = await jsonFrom(cnpjResponse);

    expect(cpfResponse.status).toBe(400);
    expect(cnpjResponse.status).toBe(400);
    expect(cpfBody.status).toBe('INVALID_INPUT');
    expect(cnpjBody.status).toBe('INVALID_INPUT');
    expect(String(cpfBody.error)).toContain('apenas nomes');
  });

  it('WIKIDATA_ENABLED=false retorna SOURCE_DISABLED sem chamar fetch', async () => {
    process.env.WIKIDATA_ENABLED = 'false';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const response = await resolveTargetPOST(postRequest({ name: 'Argus Eye Tecnologia', targetType: 'COMPANY', limit: 3 }));
    const body = await jsonFrom(response);

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body.status).toBe('SOURCE_DISABLED');
    expect(body.resolutionId).toEqual(expect.stringMatching(/^resolution-/));
    expect(body.candidates).toEqual([]);
  });

  it('sucesso retorna resolutionId e candidatos seguros', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q123', label: 'Argus Eye Tecnologia', description: 'empresa brasileira', concepturi: 'https://www.wikidata.org/entity/Q123' }],
      }),
    }));

    const response = await resolveTargetPOST(postRequest({ name: 'Argus Eye Tecnologia LTDA', targetType: 'COMPANY', context: 'teste interno', limit: 2 }));
    const body = await jsonFrom(response);
    const candidates = body.candidates as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(body.resolutionId).toEqual(expect.stringMatching(/^resolution-/));
    expect(body.status).toBe('CANDIDATES_FOUND');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].candidateId).toBe('wikidata-Q123-1');
    expect(candidates[0].sourceName).toBe('Wikidata');
    expect(candidates[0].sourceUrl).toBe('https://www.wikidata.org/entity/Q123');
    expect(candidates[0].inputName).toBeUndefined();
  });


  it('timeout/falha retorna SOURCE_ERROR controlado', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    const timeoutError = new Error('aborted');
    timeoutError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    const response = await resolveTargetPOST(postRequest({ name: 'Maria Silva', targetType: 'PERSON' }));
    const body = await jsonFrom(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe('SOURCE_ERROR');
    expect(body.resolutionId).toEqual(expect.stringMatching(/^resolution-/));
    expect(body.candidates).toEqual([]);
  });

  it('UNKNOWN retorna UNSUPPORTED sem criar evidência', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const response = await resolveTargetPOST(postRequest({ name: 'Alvo sem tipo definido', targetType: 'UNKNOWN' }));
    const body = await jsonFrom(response);

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body.status).toBe('UNSUPPORTED');
    expect('evidences' in body).toBe(false);
  });

  it('documentNormalized não aparece', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q42', label: 'Maria Fernanda Silva Costa', description: 'pessoa brasileira', concepturi: 'https://www.wikidata.org/entity/Q42' }],
      }),
    }));

    const response = await resolveTargetPOST(postRequest({ name: 'Maria Fernanda Silva Costa', targetType: 'PERSON' }));
    const serialized = JSON.stringify(await jsonFrom(response));

    expect(serialized).not.toContain('documentNormalized');
    expect(serialized).not.toContain('12345678909');
  });

  it('PF não vira CONFIRMED', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q42', label: 'Maria Fernanda Silva Costa', description: 'pessoa brasileira', concepturi: 'https://www.wikidata.org/entity/Q42' }],
      }),
    }));

    const response = await resolveTargetPOST(postRequest({ name: 'Maria Fernanda Silva Costa', targetType: 'PERSON' }));
    const body = await jsonFrom(response);
    const candidates = body.candidates as Array<Record<string, unknown>>;

    expect(body.status).toBe('CANDIDATES_FOUND');
    expect(candidates[0].status).toBe('CANDIDATE');
    expect(candidates[0].status).not.toBe('CONFIRMED');
  });

  it('candidato não vira evidência e /api/cases não é alterado', async () => {
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
    const response = await resolveTargetPOST(postRequest({ name: 'Argus Eye Tecnologia', targetType: 'COMPANY' }));
    const body = await jsonFrom(response);
    const afterCases = await casesGET();
    const after = await afterCases.json() as unknown[];

    expect('evidences' in body).toBe(false);
    expect('entities' in body).toBe(false);
    expect(after).toHaveLength(before.length);
  });

  it('múltiplos candidatos parecidos permanecem AMBIGUOUS', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [
          { id: 'Q1', label: 'João Silva', description: 'pessoa brasileira', concepturi: 'https://www.wikidata.org/entity/Q1' },
          { id: 'Q2', label: 'João Silva', description: 'pessoa portuguesa', concepturi: 'https://www.wikidata.org/entity/Q2' },
        ],
      }),
    }));

    const response = await resolveTargetPOST(postRequest({ name: 'João Silva', targetType: 'PERSON' }));
    const body = await jsonFrom(response);
    const candidates = body.candidates as Array<Record<string, unknown>>;

    expect(body.status).toBe('AMBIGUOUS');
    expect(candidates.every((candidate) => candidate.status === 'AMBIGUOUS')).toBe(true);
  });
});
