export interface InvestigationSummaryData {
  target: string;
  caseId: string | null;
  collectionJobId: string | null;
  persisted: boolean;
  counts: {
    searchResults: number;
    ledger: number;
    documents: number;
    evidenceCandidates: number;
    persistedEvidence?: number;
  };
  queries: string[];
}

interface Props {
  result: InvestigationSummaryData;
}

export default function InvestigationSummary({ result }: Props) {
  const stats = [
    ['Queries', result.queries.length],
    ['Fontes', result.counts.ledger],
    ['Documentos', result.counts.documents],
    ['Evidências candidatas', result.counts.evidenceCandidates],
  ];

  return (
    <div className="panel p-[18px] mt-[18px]">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="font-mono text-[10px] tracking-[.18em] text-[var(--blue-soft)] uppercase mb-1">Investigação concluída</div>
          <h2 className="text-lg font-bold">{result.target}</h2>
          <p className="text-[12px] text-[var(--txt-2)] mt-1">Resultado preliminar com fontes públicas. Requer revisão humana.</p>
        </div>
        <span className={`pill ${result.persisted ? 'pill-ok' : 'pill-warn'}`}>{result.persisted ? 'Persistido' : 'Sem banco'}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[var(--r-sm)] border border-[var(--line-soft)] bg-[rgba(255,255,255,.02)] p-3">
            <div className="font-mono text-[20px] font-bold text-[var(--txt)]">{value}</div>
            <div className="text-[11px] text-[var(--txt-3)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-[var(--txt-2)]">
        <div><span className="font-mono text-[var(--txt-3)]">Case ID:</span> {result.caseId ?? 'não persistido'}</div>
        <div><span className="font-mono text-[var(--txt-3)]">CollectionJob ID:</span> {result.collectionJobId ?? 'não persistido'}</div>
      </div>
    </div>
  );
}
