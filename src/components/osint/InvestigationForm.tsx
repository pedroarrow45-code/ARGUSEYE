'use client';

import { useState } from 'react';
import Link from 'next/link';
import InvestigationSummary, { type InvestigationSummaryData } from '@/components/osint/InvestigationSummary';

type InvestigationResponse = InvestigationSummaryData & {
  error?: string;
};

export default function InvestigationForm() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestigationResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTarget = target.trim();

    if (cleanTarget.length < 2) {
      setError('Informe um alvo com pelo menos 2 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/osint/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: cleanTarget }),
      });
      const data = await response.json() as InvestigationResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao iniciar investigação OSINT.');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao investigar alvo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="panel p-[18px]">
        <label htmlFor="osint-target" className="block text-[12px] font-semibold mb-2">Alvo da investigação</label>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            id="osint-target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="Nome, razão social, domínio ou identificador mascarável"
            className="flex-1 bg-[var(--ink)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]"
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Investigando…' : 'Investigar'}
          </button>
        </div>
        <p className="text-[11.5px] text-[var(--txt-3)] mt-3">
          Use apenas finalidade legítima e fontes públicas. CPF completo será mascarado pela API antes de retornar à tela.
        </p>
        {error && <div className="mt-4 text-[12px] text-[var(--red)]">{error}</div>}
      </form>

      {result && (
        <>
          <InvestigationSummary result={result} />
          <div className="flex gap-3 flex-wrap mt-4">
            {result.caseId && <Link href={`/osint/${result.caseId}`} className="btn btn-primary">Abrir detalhe</Link>}
            <Link href="/osint/history" className="btn btn-ghost">Ver histórico</Link>
          </div>
        </>
      )}
    </>
  );
}
