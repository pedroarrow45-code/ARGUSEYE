'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    group: 'Operação',
    items: [
      { label: 'Dashboard Executivo', href: '/', icon: 'dashboard' },
      { label: 'Nova Due Diligence', href: '/cases/new', icon: 'search' },
      { label: 'Investigar OSINT', href: '/osint', icon: 'osint' },
      { label: 'Histórico OSINT', href: '/osint/history', icon: 'cases' },
      { label: 'Cases', href: '/cases', icon: 'cases', badge: null },
    ],
  },
  {
    group: 'Inteligência',
    items: [
      { label: 'Modo Demo', href: '/demo', icon: 'demo' },
    ],
  },
];

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" className="w-[17px] h-[17px]"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  search: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" className="w-[17px] h-[17px]"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  cases: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" className="w-[17px] h-[17px]"><path d="M9 3h6l4 4v14H5V3z"/><path d="M9 11h6M9 15h6"/></svg>,
  osint: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" className="w-[17px] h-[17px]"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>,
  demo: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" className="w-[17px] h-[17px]"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-[248px] bg-gradient-to-b from-[var(--abyss)] to-[var(--void)] border-r border-[var(--line-soft)] sticky top-0 h-screen z-40">
      {/* Brand */}
      <div className="px-5 pt-[22px] pb-[18px] border-b border-[var(--line-soft)]">
        <Link href="/" className="flex items-center gap-[11px]">
          <div className="w-[34px] h-[34px] relative grid place-items-center flex-none">
            <span className="absolute inset-0 rounded-full animate-pulse-glow" />
            <svg viewBox="0 0 40 40" fill="none" className="w-[34px] h-[34px]">
              <ellipse cx="20" cy="20" rx="18" ry="11" stroke="#3B6FE0" strokeWidth="1.6"/>
              <circle cx="20" cy="20" r="7" fill="none" stroke="#5B86E8" strokeWidth="1.4"/>
              <circle cx="20" cy="20" r="3.4" fill="#3B6FE0"/>
              <circle cx="22" cy="18" r="1.1" fill="#fff" opacity=".85"/>
            </svg>
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-[.14em] leading-none">
              ARGUS <span className="text-[var(--blue-soft)]">EYE</span>
            </div>
            <div className="text-[9.5px] tracking-[.22em] text-[var(--txt-3)] mt-1 font-mono">
              BY ARGUS INTEL
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-[14px] px-3">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-[18px]">
            <div className="text-[9.5px] tracking-[.2em] text-[var(--txt-faint)] uppercase px-[10px] pb-2 font-semibold font-mono">
              {group.group}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-[11px] px-[11px] py-[9px] rounded-[var(--r-sm)] text-[13px] font-medium cursor-pointer transition-all duration-150 mb-0.5 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-[rgba(59,111,224,.16)] to-[rgba(59,111,224,.04)] text-white'
                      : 'text-[var(--txt-2)] hover:bg-[var(--graphite)] hover:text-[var(--txt)]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-[var(--blue)] rounded-r-[3px] shadow-[0_0_10px_var(--blue)]" />
                  )}
                  <span className="opacity-85">{ICONS[item.icon]}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Engine Status */}
      <div className="mx-3 mb-3 p-[13px] border border-[var(--line-soft)] rounded-[var(--r)] bg-gradient-to-br from-[rgba(47,182,201,.06)] to-transparent">
        <div className="flex items-center gap-2 mb-[7px]">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)] animate-blink" />
          <span className="text-xs font-bold tracking-[.04em]">
            Gazua <span className="text-[var(--cyan)]">OSINT</span> Engine
          </span>
        </div>
        <div className="text-[10px] text-[var(--txt-3)] leading-[1.4]">
          Motor de coleta, leitura e estruturação de evidências públicas.
        </div>
        <div className="h-[3px] bg-[var(--ink)] rounded-[3px] mt-[9px] overflow-hidden">
          <span className="block h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] rounded-[3px] animate-scan" />
        </div>
      </div>
    </aside>
  );
}
