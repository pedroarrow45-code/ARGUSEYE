// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InvestigationForm from '@/components/osint/InvestigationForm';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a>,
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('InvestigationForm', () => {
  it('valida input mínimo antes de chamar API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<InvestigationForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Investigar' }));

    expect(screen.getByText('Informe um alvo com pelo menos 2 caracteres.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chama endpoint e mostra resumo sem expor CPF completo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        target: '***.***.***-09',
        caseId: 'case-1',
        collectionJobId: 'job-1',
        persisted: true,
        counts: { searchResults: 1, ledger: 2, documents: 1, evidenceCandidates: 1, persistedEvidence: 1 },
        queries: ['"***.***.***-09"'],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<InvestigationForm />);
    fireEvent.change(screen.getByLabelText('Alvo da investigação'), { target: { value: '123.456.789-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Investigar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/osint/investigate', expect.objectContaining({ method: 'POST' })));
    expect(await screen.findByText('***.***.***-09')).toBeTruthy();
    expect(document.body.textContent).not.toContain('123.456.789-09');
    expect(screen.getByText('Persistido')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir detalhe' }).getAttribute('href')).toBe('/osint/case-1');
  });
});
