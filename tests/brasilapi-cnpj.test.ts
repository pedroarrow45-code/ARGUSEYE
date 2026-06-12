import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildBrasilApiEntitiesAndRelationships,
  buildBrasilApiEvidence,
  classifyCnpjRisk,
  cleanCnpj,
  fetchCompanyByCnpj,
  isValidCnpjForLookup,
  normalizeBrasilApiCnpjResponse,
} from '@/lib/connectors/brasilApiCnpjConnector';
import { collectFreeLiveEvidence } from '@/lib/collection/collectFreeLiveEvidence';
import { containsRawCpf } from '@/lib/compliance';
import type { CreateCaseInput } from '@/lib/types';

const envBackup = { ...process.env };

const mockBrasilApiResponse = {
  cnpj: '11222333000181',
  razao_social: 'ARGUS TESTE TECNOLOGIA LTDA',
  nome_fantasia: 'ARGUS TESTE',
  descricao_situacao_cadastral: 'ATIVA',
  cnae_fiscal_descricao: 'Desenvolvimento de programas de computador sob encomenda',
  municipio: 'São Paulo',
  uf: 'SP',
  capital_social: 10000,
  qsa: [
    { nome_socio: 'MARIA TESTE', qualificacao_socio: 'Sócio-Administrador' },
    { nome_socio: 'JOAO TESTE', qualificacao_socio: 'Administrador' },
  ],
};

const baseInput: CreateCaseInput = {
  targetName: 'ARGUS TESTE TECNOLOGIA LTDA',
  targetType: 'COMPANY',
  identifier: '11.222.333/0001-81',
  decisionType: 'PARTNERSHIP',
  legitimatePurpose: 'Avaliação reputacional para parceria comercial',
  context: 'Teste live free BrasilAPI',
};

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...envBackup };
});

afterEach(() => {
  process.env = { ...envBackup };
});

describe('BrasilAPI CNPJ connector', () => {
  it('detecta e limpa CNPJ com pontuação', () => {
    expect(cleanCnpj('11.222.333/0001-81')).toBe('11222333000181');
    expect(isValidCnpjForLookup('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJ inválido para consulta', () => {
    expect(isValidCnpjForLookup('11.222.333/0001')).toBe(false);
    expect(isValidCnpjForLookup('abc')).toBe(false);
  });

  it('normaliza resposta mockada da BrasilAPI como evidência, entidade e QSA', () => {
    const company = normalizeBrasilApiCnpjResponse(mockBrasilApiResponse, 'https://brasilapi.com.br/api/cnpj/v1/11222333000181', new Date('2026-06-12T12:00:00Z'));

    expect(company?.razaoSocial).toBe('ARGUS TESTE TECNOLOGIA LTDA');
    expect(company?.qsa).toHaveLength(2);

    const evidence = buildBrasilApiEvidence(company!, 'case-1');
    expect(evidence.sourceName).toBe('BrasilAPI');
    expect(evidence.sourceType).toBe('COMPANY_REGISTRY');
    expect(evidence.confidence).toBe('HIGH');
    expect(evidence.riskLevel).toBe('LOW');
    expect(evidence.summary).toContain('ARGUS TESTE TECNOLOGIA LTDA');

    const { entities, relationships } = buildBrasilApiEntitiesAndRelationships(company!, 'case-1', evidence.id);
    expect(entities[0].type).toBe('COMPANY');
    expect(relationships).toHaveLength(2);
    expect(relationships.map((relationship) => relationship.relationshipType)).toContain('administrador de');
  });

  it('classifica risco por situação cadastral', () => {
    expect(classifyCnpjRisk('ATIVA')).toBe('LOW');
    expect(classifyCnpjRisk('INAPTA')).toBe('HIGH');
    expect(classifyCnpjRisk('BAIXADA')).toBe('HIGH');
    expect(classifyCnpjRisk(undefined)).toBe('MEDIUM');
  });


  it('trata 404 da BrasilAPI sem lançar exception', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));

    const result = await fetchCompanyByCnpj('11222333000181');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it('não lança exception quando a BrasilAPI retorna erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await fetchCompanyByCnpj('11222333000181');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Consulta BrasilAPI falhou ou não retornou dados');
  });
});

describe('collectFreeLiveEvidence', () => {
  it('usa fallback mock quando LIVE_MODE=false', async () => {
    process.env.LIVE_MODE = 'false';

    const result = await collectFreeLiveEvidence(baseInput, { id: 'case-mock', createdAt: new Date('2026-06-12T12:00:00Z') });

    expect(result.collectionStatus).toBe('MOCK_READY');
    expect(result.targetName).toBe(baseInput.targetName);
    expect(result.evidences[0]?.sourceName).not.toBe('BrasilAPI');
  });

  it('consulta BrasilAPI quando LIVE_MODE=true e CNPJ válido', async () => {
    process.env.LIVE_MODE = 'true';
    process.env.BRASILAPI_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockBrasilApiResponse,
    }));

    const result = await collectFreeLiveEvidence(baseInput, { id: 'case-live', createdAt: new Date('2026-06-12T12:00:00Z') });

    expect(result.collectionStatus).toBe('BRASILAPI_COMPLETED');
    expect(result.collectionMode).toBe('LIVE');
    expect(result.targetName).toBe('ARGUS TESTE TECNOLOGIA LTDA');
    expect(result.evidences[0].sourceName).toBe('BrasilAPI');
    expect(result.entities.some((entity) => entity.type === 'COMPANY')).toBe(true);
    expect(result.relationships).toHaveLength(2);
    expect(result.collectionMessage).toContain('Consulta BrasilAPI concluída');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('simulado');
  });

  it('retorna estado vazio controlado quando LIVE_MODE=true sem CNPJ', async () => {
    process.env.LIVE_MODE = 'true';
    process.env.BRASILAPI_ENABLED = 'true';

    const result = await collectFreeLiveEvidence({ ...baseInput, identifier: undefined, targetName: 'Empresa sem documento' }, { id: 'case-empty' });

    expect(result.collectionStatus).toBe('NO_REAL_EVIDENCE');
    expect(result.evidences).toHaveLength(0);
    expect(result.collectionMessage).toContain('apenas para CNPJ');
  });


  it('retorna case com erro controlado quando BrasilAPI falha no fluxo live', async () => {
    process.env.LIVE_MODE = 'true';
    process.env.BRASILAPI_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await collectFreeLiveEvidence(baseInput, { id: 'case-live-error' });

    expect(result.collectionStatus).toBe('ERROR');
    expect(result.targetName).toBe(baseInput.targetName);
    expect(result.collectionMessage).toContain('Consulta BrasilAPI falhou ou não retornou dados');
  });


  it('mascara CPF integral informado quando live não consulta fonte real', async () => {
    process.env.LIVE_MODE = 'true';
    process.env.BRASILAPI_ENABLED = 'true';

    const result = await collectFreeLiveEvidence({
      ...baseInput,
      targetName: 'Pessoa Teste',
      targetType: 'PERSON',
      identifier: '123.456.789-09',
    }, { id: 'case-cpf-input' });

    expect(result.identifierMasked).toBe('***.***.***-09');
    expect(containsRawCpf(JSON.stringify(result))).toBe(false);
  });

  it('não persiste nem loga CPF integral em retorno serializado', async () => {
    process.env.LIVE_MODE = 'true';
    process.env.BRASILAPI_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockBrasilApiResponse,
        qsa: [{ nome_socio: 'SOCIO SEM CPF SALVO', qualificacao_socio: 'Sócio', cnpj_cpf_do_socio: '12345678909' }],
      }),
    }));

    const result = await collectFreeLiveEvidence(baseInput, { id: 'case-cpf-safe' });

    expect(containsRawCpf(JSON.stringify(result))).toBe(false);
  });
});
