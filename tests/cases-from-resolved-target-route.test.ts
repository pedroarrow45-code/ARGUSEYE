import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as createFromResolvedTargetPOST } from '@/app/api/cases/from-resolved-target/route';
import { GET as casesGET } from '@/app/api/cases/route';
import { collectFreeLiveEvidence } from '@/lib/collection/collectFreeLiveEvidence';
import type { CaseDetail } from '@/lib/types';

const envBackup = { ...process.env };

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/cases/from-resolved-target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function jsonFrom(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

const validBody = {
  name: 'Argus Eye Tecnologia LTDA',
  targetType: 'COMPANY',
  selectedCandidateId: 'wikidata-Q123-1',
  explicitUserConfirmation: true,
  decisionType: 'PARTNERSHIP',
  legitimatePurpose: 'Avaliação reputacional para parceria comercial',
  context: 'Teste de criação básica a partir de candidato',
};

function stubWikidataCompany() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      search: [{ id: 'Q123', label: 'Argus Eye Tecnologia', description: 'empresa brasileira', concepturi: 'https://www.wikidata.org/entity/Q123' }],
    }),
  }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...envBackup, WIKIDATA_ENABLED: 'true' };
});

afterEach(() => {
  process.env = { ...envBackup };
});

describe('POST /api/cases/from-resolved-target', () => {
  it('sem explicitUserConfirmation retorna erro', async () => {
    const response = await createFromResolvedTargetPOST(postRequest({ ...validBody, explicitUserConfirmation: false }));
    const body = await jsonFrom(response);

    expect(response.status).toBe(400);
    expect(body.status).toBe('INVALID_INPUT');
    expect(String(body.error)).toContain('Confirmação explícita');
  });

  it('selectedCandidateId inexistente retorna erro controlado', async () => {
    stubWikidataCompany();

    const response = await createFromResolvedTargetPOST(postRequest({ ...validBody, selectedCandidateId: 'wikidata-Q404-1' }));
    const body = await jsonFrom(response);

    expect(response.status).toBe(404);
    expect(body.status).toBe('CANDIDATE_NOT_FOUND');
  });

  it('CPF/CNPJ em name retorna INVALID_INPUT', async () => {
    const response = await createFromResolvedTargetPOST(postRequest({ ...validBody, name: '11.222.333/0001-81' }));
    const body = await jsonFrom(response);

    expect(response.status).toBe(400);
    expect(body.status).toBe('INVALID_INPUT');
    expect(String(body.error)).toContain('candidato por nome');
  });

  it('candidato válido de COMPANY cria case básico sem evidências', async () => {
    stubWikidataCompany();

    const response = await createFromResolvedTargetPOST(postRequest(validBody));
    const body = await jsonFrom(response) as { id: string; case: CaseDetail };

    expect(response.status).toBe(201);
    expect(body.id).toBe(body.case.id);
    expect(body.case.targetName).toBe('Argus Eye Tecnologia');
    expect(body.case.targetType).toBe('COMPANY');
    expect(body.case.collectionMode).toBe('LIVE');
    expect(body.case.collectionStatus).toBe('SEARCH_NOT_EXECUTED');
    expect(body.case.sourcesConsulted).toEqual(['Wikidata']);
    expect(body.case.collectionMessage).toContain('Nenhuma evidência cadastral confirmada');
    expect(body.case.evidences).toEqual([]);
    expect(body.case.entities).toEqual([]);
    expect(body.case.relationships).toEqual([]);
    expect(body.case.risks).toEqual([]);
    expect(body.case.targets[0].name).toBe('Argus Eye Tecnologia');
    expect(body.case.gaps?.join(' ')).toContain('descoberta de candidato');
  });

  it('não altera /api/cases ao criar resposta para futuro localStorage', async () => {
    process.env.DEMO_MODE = 'false';
    stubWikidataCompany();

    const beforeCases = await casesGET();
    const before = await beforeCases.json() as unknown[];
    const response = await createFromResolvedTargetPOST(postRequest(validBody));
    const body = await jsonFrom(response) as { case: CaseDetail };
    const afterCases = await casesGET();
    const after = await afterCases.json() as unknown[];

    expect(response.status).toBe(201);
    expect(body.case.id).toBeTruthy();
    expect(after).toHaveLength(before.length);
  });

  it('candidato não vira evidência e documentNormalized não aparece', async () => {
    stubWikidataCompany();

    const response = await createFromResolvedTargetPOST(postRequest(validBody));
    const serialized = JSON.stringify(await jsonFrom(response));

    expect(serialized).not.toContain('documentNormalized');
    expect(serialized).not.toContain('EV-');
    expect(serialized).not.toContain('relevantExcerpt');
  });

  it('Pessoa Física cria no máximo case básico não confirmado e sem entidade confirmada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        search: [{ id: 'Q42', label: 'Maria Fernanda Silva Costa', description: 'pessoa brasileira', concepturi: 'https://www.wikidata.org/entity/Q42' }],
      }),
    }));

    const response = await createFromResolvedTargetPOST(postRequest({
      ...validBody,
      name: 'Maria Fernanda Silva Costa',
      targetType: 'PERSON',
      selectedCandidateId: 'wikidata-Q42-1',
      decisionType: 'HIRING',
    }));
    const body = await jsonFrom(response) as { case: CaseDetail };

    expect(response.status).toBe(201);
    expect(body.case.targetType).toBe('PERSON');
    expect(body.case.entities).toEqual([]);
    expect(body.case.evidences).toEqual([]);
    expect(body.case.risks).toEqual([]);
    expect(body.case.gaps?.join(' ')).toContain('Pessoa Física não foi confirmada por nome');
  });

  it('BrasilAPI por CNPJ continua funcionando', async () => {
    process.env.DEMO_MODE = 'false';
    process.env.LIVE_MODE = 'true';
    process.env.BRASILAPI_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        cnpj: '11222333000181',
        razao_social: 'ARGUS TESTE TECNOLOGIA LTDA',
        descricao_situacao_cadastral: 'ATIVA',
        qsa: [],
      }),
    }));

    const result = await collectFreeLiveEvidence({
      targetName: 'ARGUS TESTE TECNOLOGIA LTDA',
      targetType: 'COMPANY',
      identifier: '11.222.333/0001-81',
      decisionType: 'PARTNERSHIP',
      legitimatePurpose: 'Avaliação reputacional para parceria comercial',
    }, { id: 'case-brasilapi-still-works' });

    expect(result.collectionStatus).toBe('BRASILAPI_COMPLETED');
    expect(result.evidences[0].sourceName).toBe('BrasilAPI');
  });
});
