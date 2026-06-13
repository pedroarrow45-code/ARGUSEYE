import Link from 'next/link';
import { listOsintInvestigations } from '@/lib/osint/investigations';

export const dynamic = 'force-dynamic';

export default async function OsintHistoryPage() {
  let investigations: Awaited<ReturnType<typeof listOsintInvestigations>> = [];
  let error: string | null = null;

  try {
    investigations = await listOsintInvestigations();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Não foi possível carregar o histórico OSINT.';
  }

  return (
    <>
      <div className="flex items-end justify-between gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.24em] text-[var(--blue-soft)] uppercase mb-2 flex items-center gap-2">
            <span className="w-[18px] h-px bg-[var(--blue)]" />
            OSINT · Histórico
          </div>
          <h1 className="text-[25px] font-bold tracking-tight leading-tight">Investigações recentes</h1>
          <p className="text-[var(--txt-2)] text-[13px] mt-[7px] max-w-[620px] leading-relaxed">
            Cases com ledger OSINT persistido em PostgreSQL.
          </p>
        </div>
        <Link href="/osint" className="btn btn-primary">Nova investigação</Link>
      </div>

      {error ? (
        <div className="panel p-6 text-[var(--txt-2)] text-sm">{error}</div>
      ) : investigations.length === 0 ? (
        <div className="panel p-6 text-[var(--txt-2)] text-sm">Nenhuma investigação OSINT persistida encontrada.</div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Alvo</th>
                  <th>Status</th>
                  <th>Último job</th>
                  <th>Fontes</th>
                  <th>Evidências</th>
                  <th>Criado em</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {investigations.map((item) => (
                  <tr key={item.caseId}>
                    <td className="text-[var(--txt)] font-semibold">{item.target}</td>
                    <td><span className={`pill ${item.status === 'COMPLETED' ? 'pill-ok' : item.status === 'RUNNING' ? 'pill-scan' : 'pill-warn'}`}>{item.status}</span></td>
                    <td>{item.latestCollectionJob ? <span className="font-mono text-[11px]">{item.latestCollectionJob.status}</span> : 'N/A'}</td>
                    <td>{item.sourceCount}</td>
                    <td>{item.evidenceCount}</td>
                    <td className="font-mono text-[11px]">{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                    <td><Link href={`/osint/${item.caseId}`} className="text-[var(--blue-soft)] text-[11px] font-mono hover:underline">abrir</Link></td>
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
