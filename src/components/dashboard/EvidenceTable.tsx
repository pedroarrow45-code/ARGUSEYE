import type { EvidenceData } from '@/lib/types';

interface EvidenceTableProps {
  evidences: EvidenceData[];
}

const confidenceLabels: Record<string, string> = { HIGH: 'Forte', MEDIUM: 'Média', LOW: 'Fraca' };
const confidenceColors: Record<string, string> = { HIGH: 'bg-[var(--ok)]', MEDIUM: 'bg-[var(--amber)]', LOW: 'bg-[var(--red)]' };

export default function EvidenceTable({ evidences }: EvidenceTableProps) {
  return (
    <div className="panel">
      <div className="flex items-center justify-between p-[15px_18px] border-b border-[var(--line-soft)]">
        <h3 className="text-sm font-semibold flex items-center gap-[9px]">
          <svg className="w-4 h-4 stroke-[var(--txt-2)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7">
            <path d="M12 3 4 6v6c0 4.5 3.5 7.5 8 9 4.5-1.5 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>
          </svg>
          Evidências Públicas
        </h3>
        <span className="text-[11px] text-[var(--txt-3)] font-mono">{evidences.length} evidências</span>
      </div>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Fonte</th>
              <th>Data</th>
              <th>Título</th>
              <th>Confiabilidade</th>
            </tr>
          </thead>
          <tbody>
            {evidences.map((ev) => (
              <tr key={ev.id}>
                <td className="text-[var(--txt)] font-semibold font-mono">{ev.id}</td>
                <td>{ev.sourceType}</td>
                <td>{ev.sourceName}</td>
                <td className="font-mono">{ev.accessedAt.toLocaleDateString('pt-BR')}</td>
                <td className="max-w-[300px] truncate">{ev.title}</td>
                <td>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${confidenceColors[ev.confidence]}`} />
                    {confidenceLabels[ev.confidence]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
