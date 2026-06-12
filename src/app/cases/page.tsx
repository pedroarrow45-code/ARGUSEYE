import Link from 'next/link';
import { getDemoCaseDetail } from '@/fixtures/demo-case';

export default function CasesPage() {
  const demo = getDemoCaseDetail();
  const cases = [demo];

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
            Lista de due diligences em andamento e concluídas.
          </p>
        </div>
        <Link href="/cases/new" className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14"/></svg>
          Nova Due Diligence
        </Link>
      </div>

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
    </>
  );
}
