import type { OsintLedgerEntry } from '@/lib/osint/types';

interface Props {
  entries: OsintLedgerEntry[];
}

export default function SourceLedgerTable({ entries }: Props) {
  if (entries.length === 0) {
    return <div className="panel p-5 text-[var(--txt-2)] text-sm">Nenhuma fonte registrada.</div>;
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Título</th>
              <th>URL final</th>
              <th>Acesso</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={`${entry.url}-${index}`}>
                <td><span className={`pill ${entry.status === 'EXTRACTED' ? 'pill-ok' : entry.status === 'ERROR' ? 'pill-warn' : 'pill-scan'}`}>{entry.status}</span></td>
                <td className="text-[var(--txt)] font-semibold">{entry.title ?? 'Sem título'}</td>
                <td className="max-w-[420px] truncate">
                  {(entry.finalUrl ?? entry.url).startsWith('http') ? (
                    <a href={entry.finalUrl ?? entry.url} target="_blank" rel="noreferrer" className="text-[var(--blue-soft)] hover:underline">
                      {entry.finalUrl ?? entry.url}
                    </a>
                  ) : entry.finalUrl ?? entry.url}
                </td>
                <td className="font-mono text-[11px]">{new Date(entry.fetchedAt).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
