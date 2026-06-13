import Link from 'next/link';
import InvestigationForm from '@/components/osint/InvestigationForm';

export default function OsintPage() {
  return (
    <>
      <div className="flex items-end justify-between gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.24em] text-[var(--blue-soft)] uppercase mb-2 flex items-center gap-2">
            <span className="w-[18px] h-px bg-[var(--blue)]" />
            OSINT · Investigação pública
          </div>
          <h1 className="text-[25px] font-bold tracking-tight leading-tight">Nova investigação OSINT</h1>
          <p className="text-[var(--txt-2)] text-[13px] mt-[7px] max-w-[640px] leading-relaxed">
            Execute o pipeline SearXNG, dedupe, fetch seguro, extração HTML, ledger de fontes, evidências candidatas e relatório Markdown.
          </p>
        </div>
        <Link href="/osint/history" className="btn btn-ghost">Histórico OSINT</Link>
      </div>

      <InvestigationForm />
    </>
  );
}
