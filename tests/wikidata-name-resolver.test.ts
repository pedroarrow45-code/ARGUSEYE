import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveNameWithFreeSources } from '@/lib/name-resolution-free-sources';
import { WikidataNameResolver } from '@/lib/connectors/wikidataNameResolver';

const envBackup = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...envBackup };
});

afterEach(() => {
  process.env = { ...envBackup };
});

describe('resolveNameWithFreeSources', () => {
  it('WIKIDATA_ENABLED=false não chama fetch e retorna resultado controlado', async () => {
    process.env.WIKIDATA_ENABLED = 'false';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await resolveNameWithFreeSources({ inputName: 'Maria Silva', targetType: 'PERSON' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('NOT_FOUND');
    expect(result.candidates).toEqual([]);
    expect(result.notes.join(' ')).toContain('WIKIDATA_ENABLED=false');
  });

  it('busca bem-sucedida retorna candidatos com sourceUrl verificável', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    process.env.MAX_NAME_CANDIDATES_PER_CASE = '3';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q123', label: 'Argus Eye Tecnologia', description: 'empresa brasileira', concepturi: 'https://www.wikidata.org/entity/Q123' }],
      }),
    }));

    const result = await resolveNameWithFreeSources({ inputName: 'Argus Eye Tecnologia LTDA', targetType: 'COMPANY' });

    expect(result.status).toBe('CANDIDATE');
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].sourceName).toBe('Wikidata');
    expect(result.candidates[0].sourceUrl).toBe('https://www.wikidata.org/entity/Q123');
    expect(result.candidates[0].status).toBe('CANDIDATE');
    expect(result.candidates[0].confidence).toBe('HIGH');
    expect('evidences' in result).toBe(false);
    expect('entities' in result).toBe(false);
  });

  it('falha ou timeout retorna erro controlado sem lançar exception', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    const timeoutError = new Error('aborted');
    timeoutError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    const result = await resolveNameWithFreeSources({ inputName: 'Maria Silva', targetType: 'PERSON' });

    expect(result.status).toBe('NOT_FOUND');
    expect(result.candidates).toEqual([]);
    expect(result.notes.join(' ')).toContain('Timeout ao consultar Wikidata');
  });

  it('múltiplos candidatos parecidos ficam AMBIGUOUS', async () => {
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

    const result = await resolveNameWithFreeSources({ inputName: 'João Silva', targetType: 'PERSON' });

    expect(result.status).toBe('AMBIGUOUS');
    expect(result.candidates.every((candidate) => candidate.status === 'AMBIGUOUS')).toBe(true);
    expect(result.candidates[0].matchSignals.map((signal) => signal.kind)).toContain('WIKIDATA_AMBIGUOUS_RESULTS');
  });

  it('Pessoa Física não vira CONFIRMED por resultado Wikidata', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q42', label: 'Maria Fernanda Silva Costa', description: 'pessoa brasileira', concepturi: 'https://www.wikidata.org/entity/Q42' }],
      }),
    }));

    const result = await resolveNameWithFreeSources({ inputName: 'Maria Fernanda Silva Costa', targetType: 'PERSON' });

    expect(result.status).toBe('CANDIDATE');
    expect(result.candidates[0].status).toBe('CANDIDATE');
    expect(result.candidates[0].status).not.toBe('CONFIRMED');
  });

  it('score baixo retorna REJECTED ou LOW confidence', async () => {
    process.env.WIKIDATA_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q999', label: 'Entidade Sem Relação', description: 'organização', concepturi: 'https://www.wikidata.org/entity/Q999' }],
      }),
    }));

    const result = await resolveNameWithFreeSources({ inputName: 'Argus Eye Tecnologia LTDA', targetType: 'COMPANY' });

    expect(result.candidates[0].matchScore).toBeLessThan(35);
    expect(result.candidates[0].status).toBe('REJECTED');
    expect(result.candidates[0].confidence).toBe('LOW');
  });
});

describe('WikidataNameResolver', () => {
  it('usa limite baixo e timeout configurado na chamada server-side', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ search: [] }) });
    vi.stubGlobal('fetch', fetchSpy);

    const resolver = new WikidataNameResolver();
    await resolver.search({ inputName: 'Argus Eye', targetType: 'COMPANY', limit: 50, timeoutMs: 1500 });

    const [url, options] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('limit=10');
    expect(options.cache).toBe('no-store');
    expect(options.signal).toBeDefined();
  });
});
