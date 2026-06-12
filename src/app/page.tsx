import Link from 'next/link';
import ComplianceBanner from '@/components/dashboard/ComplianceBanner';
import StatCard from '@/components/dashboard/StatCard';
import RiskRanking from '@/components/dashboard/RiskRanking';
import { getDemoCaseDetail } from '@/fixtures/demo-case';
import { analyzeCase } from '@/lib/analyzer/argusAnalyzer';

export default function DashboardPage() {
  const demo = getDemoCaseDetail();
  const analysis = analyzeCase(demo, demo.targets, demo.evidences, demo.entities, demo.relationships, demo.risks);
  const m = analysis.metrics;

  const stats = [
    { icon: userIcon, value: m.casesInProgress, label: 'Cases em Análise', trend: '+1', dir: 'up' as const, acc: 'rgba(59,111,224,.16)', icb: 'rgba(59,111,224,.12)', icc: '#5B86E8' },
    { icon: shieldIcon, value: m.publicEvidences, label: 'Evidências Públicas', trend: `+${m.publicEvidences}`, dir: 'up' as const, acc: 'rgba(47,182,201,.14)', icb: 'rgba(47,182,201,.12)', icc: '#2FB6C9' },
    { icon: scaleIcon, value: m.lawsuitsFound, label: 'Processos Localizados', trend: `+${m.lawsuitsFound}`, dir: 'up' as const, acc: 'rgba(59,111,224,.14)', icb: 'rgba(59,111,224,.12)', icc: '#5B86E8' },
    { icon: fileIcon, value: m.pdfsScanned, label: 'PDFs Varredos', trend: `+${m.pdfsScanned}`, dir: 'up' as const, acc: 'rgba(47,182,201,.12)', icb: 'rgba(47,182,201,.12)', icc: '#2FB6C9' },
    { icon: flagIcon, value: m.criticalRedFlags, label: 'Red Flags Críticas', trend: `+${m.criticalRedFlags}`, dir: 'down' as const, acc: 'rgba(232,162,61,.16)', icb: 'rgba(232,162,61,.12)', icc: '#E8A23D' },
    { icon: linkIcon, value: m.connectionsFound, label: 'Vínculos Encontrados', trend: `+${m.connectionsFound}`, dir: 'up' as const, acc: 'rgba(59,111,224,.12)', icb: 'rgba(59,111,224,.12)', icc: '#5B86E8' },
  ];

  return (
    <>
      <div className="flex items-end justify-between gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.24em] text-[var(--blue-soft)] uppercase mb-2 flex items-center gap-2">
            <span className="w-[18px] h-px bg-[var(--blue)]" />
            Mission Control · Gazua OSINT
          </div>
          <h1 className="text-[25px] font-bold tracking-tight leading-tight">Dashboard Executivo</h1>
          <p className="text-[var(--txt-2)] text-[13px] mt-[7px] max-w-[560px] leading-relaxed">
            Visão consolidada da operação de inteligência pública e due diligence estratégica em curso.
          </p>
        </div>
        <div className="flex gap-[10px] flex-wrap">
          <Link href="/demo" className="btn btn-ghost">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
            Modo Demo
          </Link>
          <Link href="/cases/new" className="btn btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14"/></svg>
            Nova Due Diligence
          </Link>
        </div>
      </div>

      <ComplianceBanner />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(195px,1fr))] gap-[14px] mb-[22px]">
        {stats.map((s, i) => (
          <StatCard
            key={i}
            icon={s.icon}
            value={s.value}
            label={s.label}
            trend={s.trend}
            trendDirection={s.dir}
            accentColor={s.acc}
            iconBg={s.icb}
            iconColor={s.icc}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-[18px]">
        <RiskRanking risks={demo.risks} entities={demo.entities} />

        <div className="panel">
          <div className="flex items-center justify-between p-[15px_18px] border-b border-[var(--line-soft)]">
            <h3 className="text-sm font-semibold flex items-center gap-[9px]">
              <svg className="w-4 h-4 stroke-[var(--txt-2)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              Atividades Recentes
            </h3>
          </div>
          <div className="p-[18px]">
            {[
              { icon: flagIcon, color: '#E8A23D', text: <><b className="font-semibold text-white">Red flag CRÍTICA</b> — concentração de contratos em curto período.</>, time: 'há 14 min' },
              { icon: fileIcon, color: '#2FB6C9', text: <>Gazua OSINT varreu <b className="font-semibold text-white">{m.pdfsScanned} PDFs</b>. Citações relevantes extraídas.</>, time: 'há 38 min' },
              { icon: scaleIcon, color: '#5B86E8', text: <>Novo processo localizado: <b className="font-semibold text-white">TJ-RJ — Ação de Improbidade</b></>, time: 'há 1 h' },
              { icon: checkIcon, color: '#3FB57A', text: <>Evidência <b className="font-semibold text-white">EV-0142</b> classificada como <b className="font-semibold text-white">Forte</b>.</>, time: 'há 2 h' },
            ].map((item, i) => (
              <div key={i} className={`flex gap-3 py-[11px] ${i < 3 ? 'border-b border-[var(--line-soft)]' : ''}`}>
                <div className="w-[30px] h-[30px] rounded-lg flex-none grid place-items-center bg-[var(--graphite)] border border-[var(--line-soft)]" style={{ color: item.color }}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] leading-[1.45] text-[var(--txt)]">{item.text}</div>
                  <div className="text-[10.5px] text-[var(--txt-faint)] font-mono mt-[3px]">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const userIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>;
const shieldIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 4 6v6c0 4.5 3.5 7.5 8 9 4.5-1.5 8-4.5 8-9V6z"/></svg>;
const scaleIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M9 3h6l4 4v14H5V3z"/><path d="M9 11h6M9 15h6"/></svg>;
const fileIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M7 3h7l5 5v13H7z"/><path d="M9 13h6M9 16h4"/></svg>;
const flagIcon = <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M5 3v18M5 4h11l-2 4 2 4H5"/></svg>;
const linkIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="m7.8 7.6 2.6 7M16.5 9l-3 6"/></svg>;
const checkIcon = <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M5 12l5 5L20 6"/></svg>;
