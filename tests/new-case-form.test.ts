// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewCaseForm from '@/components/cases/NewCaseForm';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

function makeCase(id = 'case-from-candidate-1') {
  const now = new Date('2026-06-12T12:00:00Z');
  return {
    id,
    caseName: 'DUE-2026-RES-test',
    targetName: 'Argus Eye Tecnologia',
    targetType: 'COMPANY',
    decisionType: 'PARTNERSHIP',
    legitimatePurpose: 'Avaliação reputacional para parceria comercial',
    context: 'Contexto de teste',
    collectionStatus: 'SEARCH_NOT_EXECUTED',
    collectionMode: 'LIVE',
    collectionMessage: 'Case criado a partir de candidato selecionado em fonte pública gratuita. Nenhuma evidência cadastral confirmada foi gerada nesta etapa.',
    sourcesConsulted: ['Wikidata'],
    gaps: ['Wikidata foi usada apenas para descoberta de candidato por nome.'],
    status: 'COMPLETED',
    overallRisk: 'MEDIUM',
    recommendation: 'INVESTIGATE_FURTHER',
    createdAt: now,
    updatedAt: now,
    targets: [{ id: 'target-1', caseId: id, name: 'Argus Eye Tecnologia', type: 'COMPANY', createdAt: now }],
    evidences: [],
    entities: [],
    relationships: [],
    risks: [],
    collectionJobs: [{ id: 'job-1', caseId: id, status: 'COMPLETED', mode: 'LIVE', createdAt: now, updatedAt: now }],
  };
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Nome do alvo'), { target: { value: 'Argus Eye Tecnologia LTDA' } });
  fireEvent.change(screen.getByLabelText('Objetivo da análise'), { target: { value: 'PARTNERSHIP' } });
  fireEvent.change(screen.getByLabelText('Finalidade legítima da análise'), { target: { value: 'Avaliação reputacional para parceria comercial' } });
  fireEvent.change(screen.getByLabelText(/Contexto da decisão/), { target: { value: 'Contexto de teste' } });
}

beforeEach(() => {
  pushMock.mockReset();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NewCaseForm name-first flow', () => {
  it('resolve nome, exibe candidatos, cria case escolhido, salva localStorage e navega', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resolutionId: 'resolution-1',
          status: 'CANDIDATES_FOUND',
          candidates: [{
            candidateId: 'wikidata-Q123-1',
            displayName: 'Argus Eye Tecnologia',
            normalizedName: 'argus eye tecnologia',
            targetType: 'COMPANY',
            sourceName: 'Wikidata',
            sourceUrl: 'https://www.wikidata.org/entity/Q123',
            matchScore: 96,
            matchSignals: [],
            confidence: 'HIGH',
            status: 'CANDIDATE',
            collectedAt: '2026-06-12T12:00:00Z',
            documentNormalized: '11222333000181',
          }],
          notes: ['Candidato não é evidência.'],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'case-from-candidate-1', case: makeCase() }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(React.createElement(NewCaseForm));

    fireEvent.click(screen.getByRole('button', { name: 'Pessoa Jurídica (PJ)' }));
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar candidatos' }));

    expect(await screen.findByText('Argus Eye Tecnologia')).toBeTruthy();
    expect(screen.getAllByText(/Wikidata/).length).toBeGreaterThan(0);
    expect(screen.getByText(/score 96/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir fonte' }).getAttribute('href')).toBe('https://www.wikidata.org/entity/Q123');
    expect(document.body.textContent).not.toContain('documentNormalized');
    expect(document.body.textContent).not.toContain('11222333000181');
    expect(document.body.textContent).not.toContain('EV-');

    expect(fetchMock).toHaveBeenCalledWith('/api/resolve-target', expect.objectContaining({ method: 'POST' }));
    const resolvePayload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(resolvePayload.name).toBe('Argus Eye Tecnologia LTDA');

    fireEvent.click(screen.getByRole('button', { name: 'Criar case básico com este candidato' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/cases/case-from-candidate-1'));
    expect(fetchMock).toHaveBeenCalledWith('/api/cases/from-resolved-target', expect.objectContaining({ method: 'POST' }));
    const createPayload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(createPayload.explicitUserConfirmation).toBe(true);
    expect(createPayload.selectedCandidateId).toBe('wikidata-Q123-1');

    const stored = window.localStorage.getItem('argus-eye.local-cases.v1');
    expect(stored).toContain('case-from-candidate-1');
  });

  it('exibe resultado ambíguo e nenhum candidato encontrado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'AMBIGUOUS', candidates: [] }),
    }));

    render(React.createElement(NewCaseForm));
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar candidatos' }));

    expect(await screen.findByText('Resultado ambíguo. Revise os candidatos antes de criar um case básico.')).toBeTruthy();
    expect(screen.getByText('Nenhum candidato disponível para seleção.')).toBeTruthy();
  });

  it('exibe erro claro quando criação de case para Pessoa Física é rejeitada', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'CANDIDATES_FOUND',
          candidates: [{
            candidateId: 'wikidata-Q42-1',
            displayName: 'Maria Fernanda Silva Costa',
            normalizedName: 'maria fernanda silva costa',
            targetType: 'PERSON',
            sourceName: 'Wikidata',
            sourceUrl: 'https://www.wikidata.org/entity/Q42',
            matchScore: 98,
            matchSignals: [],
            confidence: 'HIGH',
            status: 'CANDIDATE',
            collectedAt: '2026-06-12T12:00:00Z',
          }],
        }),
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    render(React.createElement(NewCaseForm));
    fireEvent.change(screen.getByLabelText('Nome do alvo'), { target: { value: 'Maria Fernanda Silva Costa' } });
    fireEvent.change(screen.getByLabelText('Objetivo da análise'), { target: { value: 'HIRING' } });
    fireEvent.change(screen.getByLabelText('Finalidade legítima da análise'), { target: { value: 'Avaliação reputacional para contratação executiva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar candidatos' }));

    expect(await screen.findByText('Maria Fernanda Silva Costa')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Criar case básico com este candidato' }));

    expect(await screen.findByText('Busca real por Pessoa Física baseada apenas em nome ainda não está disponível para criação de case nesta versão.')).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
