import Link from 'next/link';
import { getOsintInvestigationDetail } from '@/lib/osint/investigations';
import SourceLedgerTable from '@/components/osint/SourceLedgerTable';
import EvidenceList from '@/components/osint/EvidenceList';
import MarkdownReportView from '@/components/osint/MarkdownReportView';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ caseId: string }>;
}

export default async function OsintDetailPage({ params }: Props) {
  const { caseId } = await params;
  let detail: Awaited<ReturnType<typeof getOsintInvestigationDetail>> = null;
  let error: string | null = null;

  try {
    detail = await getOsintInvestigationDetail(caseId);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Não foi possível abrir a investigação OSINT.';
  }

  if (error) {
    return <div className="panel p-6 text-[var(--txt-2)] text-sm">{error}</div>;
  }

  if (!detail) {
    return <div className="panel p-6 text-[var(--txt-2)] text-sm">Investigação OSINT não encontrada.</div>;
  }

  const latestJob = detail.collectionJobs[0];
  const queries = [...new Set(detail.ledger.map((entry) => entry.query).filter(Boolean))];

  return (
    <>
      <div className="flex items-end justify-between gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.24em] text-[var(--blue-soft)] uppercase mb-2 flex items-center gap-2">
            <span className="w-[18px] h-px bg-[var(--blue)]" />
            OSINT · Detalhe
          </div>
          <h1 className="text-[25px] font-bold tracking-tight leading-tight">{detail.case.targetName}</h1>
          <p className="text-[var(--txt-2)] text-[13px] mt-[7px] max-w-[620px] leading-relaxed">
            Case {detail.case.id} · Job {latestJob?.id ?? 'N/A'}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/osint/history" className="btn btn-ghost">Histórico</Link>
          <Link href="/osint" className="btn btn-primary">Nova investigação</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-[22px]">
        <SummaryCard label="Status" value={detail.case.status} />
        <SummaryCard label="Queries" value={queries.length} />
        <SummaryCard label="Fontes" value={detail.ledger.length} />
        <SummaryCard label="Evidências" value={detail.evidenceCandidates.length} />
      </div>

      <section className="mb-[22px]">
        <h2 className="text-lg font-bold mb-3">Queries executadas</h2>
        <div className="panel p-4 text-[12px] text-[var(--txt-2)] font-mono space-y-2">
          {queries.length ? queries.map((query) => <div key={query}>{query}</div>) : <div>Nenhuma query registrada.</div>}
        </div>
      </section>

      <section className="mb-[22px]">
        <h2 className="text-lg font-bold mb-3">Fontes consultadas</h2>
        <SourceLedgerTable entries={detail.ledger} />
      </section>

      <section className="mb-[22px]">
        <h2 className="text-lg font-bold mb-3">Documentos extraídos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detail.documents.length ? detail.documents.map((document) => (
            <div key={document.textHash} className="panel p-[16px]">
              <h3 className="font-semibold text-sm mb-1">{document.title}</h3>
              <p className="text-[12px] text-[var(--txt-2)] mb-2">{document.description || 'Sem descrição.'}</p>
              <div className="text-[11px] text-[var(--txt-3)] font-mono">Hash: {document.textHash.slice(0, 16)}…</div>
            </div>
          )) : <div className="panel p-5 text-[var(--txt-2)] text-sm">Nenhum documento extraído.</div>}
        </div>
      </section>

      <section className="mb-[22px]">
        <h2 className="text-lg font-bold mb-3">Evidências candidatas</h2>
        <EvidenceList evidences={detail.evidenceCandidates} />
      </section>

      <section className="mb-[22px]">
        <h2 className="text-lg font-bold mb-3">Relatório Markdown</h2>
        <MarkdownReportView markdown={detail.reportMarkdown} />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Limitações</h2>
        <div className="panel p-4 text-[12px] text-[var(--txt-2)] space-y-2">
          {detail.limitations.map((limitation) => <div key={limitation}>• {limitation}</div>)}
        </div>
      </section>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-4">
      <div className="font-mono text-[20px] font-bold">{value}</div>
      <div className="text-[11px] text-[var(--txt-3)] mt-1">{label}</div>
    </div>
  );
}
