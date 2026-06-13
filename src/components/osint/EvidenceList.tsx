import type { OsintEvidenceCandidate } from '@/lib/osint/types';

interface Props {
  evidences: OsintEvidenceCandidate[];
}

export default function EvidenceList({ evidences }: Props) {
  if (evidences.length === 0) {
    return <div className="panel p-5 text-[var(--txt-2)] text-sm">Nenhuma evidência candidata registrada.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {evidences.map((evidence) => (
        <div key={evidence.id} className="panel p-[16px]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-sm">{evidence.title}</h3>
            <span className="pill pill-ok">{evidence.confidence}</span>
          </div>
          <p className="text-[12px] text-[var(--txt-2)] leading-relaxed mb-3">{evidence.excerpt || evidence.reason}</p>
          {evidence.sourceUrl && (
            <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-[var(--blue-soft)] hover:underline">Abrir fonte</a>
          )}
        </div>
      ))}
    </div>
  );
}
