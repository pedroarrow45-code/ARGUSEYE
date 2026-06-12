'use client';

import Link from 'next/link';

export default function Topbar() {
  return (
    <header className="sticky top-0 z-35 bg-[var(--glass-2)] backdrop-blur-[18px] border-b border-[var(--line-soft)] px-[26px] py-[13px] flex items-center gap-[18px]">
      <div className="flex-1 max-w-[560px] relative">
        <svg className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4 h-4 stroke-[var(--txt-3)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7">
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          className="w-full !bg-[var(--ink)] !border-[var(--line)] !rounded-[var(--r-sm)] !py-[10px] !pl-10 !pr-[14px] text-[13px] placeholder:text-[var(--txt-faint)]"
          placeholder="Busca global — alvos, processos, documentos, evidências…"
          readOnly
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--txt-faint)] border border-[var(--line)] rounded px-1.5 py-0.5">
          ⌘K
        </span>
      </div>

      <div className="flex items-center gap-[10px] ml-auto">
        <Link
          href="/cases/new"
          className="btn btn-primary text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nova Due Diligence
        </Link>
        <div className="flex items-center gap-[9px] py-[5px] px-3 pl-[6px] border border-[var(--line)] rounded-full bg-[var(--graphite)]">
          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--cyan)] grid place-items-center font-bold text-xs text-white">
            OP
          </div>
          <div>
            <div className="text-[12.5px] font-semibold leading-none">Operador</div>
            <div className="text-[10px] text-[var(--txt-3)] font-mono">analista</div>
          </div>
        </div>
      </div>
    </header>
  );
}
