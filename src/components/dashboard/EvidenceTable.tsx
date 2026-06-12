import type { EvidenceData } from '@/lib/types';

interface EvidenceTableProps {
  evidences: EvidenceData[];
}

const confidenceLabels: Record<string, string> = { HIGH: 'Forte', MEDIUM: 'Média', LOW: 'Fraca' };
const confidenceColors: Record<string, string> = { HIGH: 'bg-[var(--ok)]', MEDIUM: 'bg-[var(--amber)]', LOW: 'bg-[var(--red)]' };
const riskLabels: Record<string, string> = { LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', CRITICAL: 'Crítico' };

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
              <th>Título / Resumo</th>
              <th>Confiabilidade</th>
              <th>Risco</th>
            </tr>
          </thead>
          <tbody>
            {evidences.map((ev) => (
              <tr key={ev.id}>
                <td className="text-[var(--txt)] font-semibold font-mono">{ev.id}</td>
                <td>{ev.sourceType}</td>
                <td>
                  {ev.sourceUrl ? (
                    <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--blue-soft)] hover:underline">{ev.sourceName}</a>
                  ) : ev.sourceName}
                  {ev.sourceName === 'BrasilAPI' && <div className="text-[10.5px] text-[var(--ok)] font-mono mt-1">Fonte real: BrasilAPI</div>}
                </td>
                <td className="font-mono">{ev.accessedAt.toLocaleString('pt-BR')}</td>
                <td className="max-w-[420px]">
                  <div className="font-semibold text-[var(--txt)]">{ev.title}</div>
                  {ev.summary && <div className="text-[11.5px] text-[var(--txt-2)] mt-1 leading-relaxed">{ev.summary}</div>}
                </td>
                <td>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${confidenceColors[ev.confidence]}`} />
                    {confidenceLabels[ev.confidence]}
                  </span>
                </td>
                <td>{ev.riskLevel ? <span className={`sev sev-${ev.riskLevel}`}>{riskLabels[ev.riskLevel] ?? ev.riskLevel}</span> : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
