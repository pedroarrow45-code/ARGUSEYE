'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLocalCases, clearLocalCases, subscribeToLocalCases } from '@/lib/local-cases';
import type { CaseDetail } from '@/lib/types';

export default function CasesPage() {
  const [cases, setCases] = useState<CaseDetail[]>([]);

  useEffect(() => {
    const refresh = () => setCases(getLocalCases());
    refresh();
    return subscribeToLocalCases(refresh);
  }, []);

  const hasCases = cases.length > 0;

  return (
    <>
      <div className="flex items-end justify-between gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.24em] text-[var(--blue-soft)] uppercase mb-2 flex items-center gap-2">
            <span className="w-[18px] h-px bg-[var(--blue)]" />
            Cases · Due Diligence
          </div>
          <h1 className="text-[25px] font-bold tracking-tight leading-tight">Cases em Análise</h1>
          <p className="text-[var(--txt-2)] text-[13px] mt-[7px] max-w-[560px] leading-relaxed">
            Lista de due diligences criadas neste navegador para o MVP funcional.
          </p>
        </div>
        <div className="flex gap-[10px] flex-wrap">
          <Link href="/" className="btn btn-ghost">
            Dashboard
          </Link>
          {hasCases && (
            <button type="button" className="btn btn-ghost" onClick={() => clearLocalCases()}>
              Limpar cases locais
            </button>
          )}
          <Link href="/cases/new" className="btn btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14"/></svg>
            Nova Due Diligence
          </Link>
        </div>
      </div>

      {!hasCases ? (
        <div className="panel p-8 text-center">
          <div className="font-mono text-[11px] tracking-[.16em] text-[var(--txt-3)] uppercase mb-3">Nenhum case local criado</div>
          <h2 className="text-xl font-bold mb-2">Crie uma due diligence para testar o fluxo ponta a ponta.</h2>
          <p className="text-[var(--txt-2)] text-sm mb-5">
            O modo demo permanece separado e continua disponível com dados fictícios fixos.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/cases/new" className="btn btn-primary">Criar nova due diligence</Link>
            <Link href="/demo" className="btn btn-ghost">Abrir demo</Link>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Alvo</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Risco</th>
                  <th>Criado em</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="text-[var(--txt)] font-semibold font-mono">{c.caseName}</td>
                    <td className="text-[var(--txt)] font-semibold">{c.targetName}</td>
                    <td>{c.targetType}</td>
                    <td>
                      <span className={`pill ${c.status === 'COMPLETED' ? 'pill-ok' : c.status === 'RUNNING' ? 'pill-scan' : 'pill-warn'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.overallRisk && (
                        <span className={`sev sev-${c.overallRisk}`}>{c.overallRisk}</span>
                      )}
                    </td>
                    <td className="font-mono">{c.createdAt.toLocaleDateString('pt-BR')}</td>
                    <td>
                      <Link href={`/cases/${c.id}`} className="text-[var(--blue-soft)] text-[11px] font-mono hover:underline flex items-center gap-1">
                        <svg className="w-[11px] h-[11px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M14 4h6v6M20 4l-9 9M10 6H5v13h13v-5"/></svg>
                        abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
