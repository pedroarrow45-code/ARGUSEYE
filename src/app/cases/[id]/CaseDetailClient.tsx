'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { CaseDetail } from '@/lib/types';
import { analyzeCase } from '@/lib/analyzer/argusAnalyzer';
import ComplianceBanner from '@/components/dashboard/ComplianceBanner';
import StatCard from '@/components/dashboard/StatCard';
import EvidenceTable from '@/components/dashboard/EvidenceTable';
import RedFlagCard from '@/components/dashboard/RedFlagCard';

const ConnectionMap = dynamic(() => import('@/components/graph/ConnectionMap'), { ssr: false });

interface Props {
  caseDetail: CaseDetail;
}

export default function CaseDetailClient({ caseDetail }: Props) {
  const analysis = analyzeCase(
    caseDetail,
    caseDetail.targets,
    caseDetail.evidences,
    caseDetail.entities,
    caseDetail.relationships,
    caseDetail.risks
  );
  const m = analysis.metrics;
  const target = caseDetail.targets[0];

  const recLabels: Record<string, { label: string; color: string }> = {
    PROCEED: { label: 'Prosseguir', color: 'var(--ok)' },
    PROCEED_WITH_CAUTION: { label: 'Prosseguir com cautela', color: 'var(--amber)' },
    INVESTIGATE_FURTHER: { label: 'Aprofundar investigação', color: 'var(--amber)' },
    SUSPEND_DECISION: { label: 'Suspender decisão', color: 'var(--red)' },
    NOT_RECOMMENDED: { label: 'Não recomendado', color: 'var(--crit)' },
  };
  const rec = recLabels[analysis.recommendation] || recLabels.INVESTIGATE_FURTHER;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.24em] text-[var(--blue-soft)] uppercase mb-2 flex items-center gap-2">
            <span className="w-[18px] h-px bg-[var(--blue)]" />
            Case · {caseDetail.caseName}
          </div>
          <h1 className="text-[25px] font-bold tracking-tight leading-tight">
            {caseDetail.targetName}
          </h1>
          <p className="text-[var(--txt-2)] text-[13px] mt-[7px] max-w-[560px] leading-relaxed">
            {caseDetail.legitimatePurpose}
          </p>
        </div>
        <div className="flex gap-[10px] flex-wrap">
          <Link href="/" className="btn btn-ghost">Dashboard</Link>
          <Link href="/cases/new" className="btn btn-ghost">Nova due diligence</Link>
          <span className={`sev sev-${caseDetail.overallRisk}`}>{caseDetail.overallRisk}</span>
          <span className={`pill ${caseDetail.status === 'COMPLETED' ? 'pill-ok' : 'pill-scan'}`}>{caseDetail.status}</span>
        </div>
      </div>

      <ComplianceBanner />

      {/* Profile Hero */}
      {target && (
        <div className="panel p-[18px] mb-[18px]">
          <div className="flex gap-5 items-start flex-wrap">
            <div className="w-[84px] h-[84px] rounded-[18px] bg-gradient-to-br from-[var(--deep-blue)] to-[var(--graphite)] border border-[var(--line)] grid place-items-center text-[30px] font-bold flex-none relative">
              {target.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              <div className="absolute -inset-1 rounded-[22px] border border-dashed border-[var(--steel)] animate-spin-slow" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <div className="text-[22px] font-bold flex items-center gap-3 flex-wrap">
                {target.name}
                <span className="text-[10px] font-mono px-[7px] py-0.5 rounded bg-[rgba(59,111,224,.16)] text-[var(--blue-soft)]">
                  {target.type}
                </span>
                {caseDetail.overallRisk && (
                  <span className={`sev sev-${caseDetail.overallRisk}`}>{caseDetail.overallRisk}</span>
                )}
              </div>
              <div className="flex gap-[22px] mt-4 flex-wrap">
                <div>
                  <div className="text-[10px] font-mono tracking-[.1em] uppercase text-[var(--txt-3)] mb-1">Tipo</div>
                  <div className="text-sm font-semibold">{target.type === 'PERSON' ? 'Pessoa Física' : 'Pessoa Jurídica'} · {target.sector || 'N/A'}</div>
                </div>
                {target.documentMasked && (
                  <div>
                    <div className="text-[10px] font-mono tracking-[.1em] uppercase text-[var(--txt-3)] mb-1">{target.type === 'PERSON' ? 'CPF' : 'CNPJ'} (mascarado)</div>
                    <div className="text-sm font-semibold font-mono">{target.documentMasked}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-mono tracking-[.1em] uppercase text-[var(--txt-3)] mb-1">Status</div>
                  <div className="text-sm font-semibold">Em análise</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(195px,1fr))] gap-[14px] mb-[22px]">
        <StatCard icon={shieldIcon} value={m.publicEvidences} label="Evidências Públicas" iconBg="rgba(47,182,201,.12)" iconColor="#2FB6C9" />
        <StatCard icon={scaleIcon} value={m.lawsuitsFound} label="Processos Localizados" iconBg="rgba(59,111,224,.12)" iconColor="#5B86E8" />
        <StatCard icon={fileIcon} value={m.pdfsScanned} label="PDFs Varredos" iconBg="rgba(47,182,201,.12)" iconColor="#2FB6C9" />
        <StatCard icon={flagIcon} value={m.criticalRedFlags} label="Red Flags" iconBg="rgba(232,162,61,.12)" iconColor="#E8A23D" />
        <StatCard icon={linkIcon} value={m.connectionsFound} label="Vínculos" iconBg="rgba(59,111,224,.12)" iconColor="#5B86E8" />
      </div>

      {/* Red Flags */}
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 stroke-[var(--red)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7"><path d="M5 3v18M5 4h11l-2 4 2 4H5"/></svg>
        Red Flags
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-[15px] mb-[22px]">
        {caseDetail.risks.map(r => <RedFlagCard key={r.id} risk={r} />)}
      </div>

      {/* Evidence Table */}
      <div className="mb-[22px]">
        <EvidenceTable evidences={caseDetail.evidences} />
      </div>

      {/* Connection Map */}
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 stroke-[var(--blue-soft)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="m7.8 7.6 2.6 7M16.5 9l-3 6"/></svg>
        Mapa de Conexões
      </h2>
      <div className="mb-[22px]">
        <ConnectionMap graphData={analysis.graphData} />
      </div>

      {/* Executive Recommendation */}
      <div className="panel p-6 mb-[22px]">
        <h2 className="text-lg font-bold mb-4">Recomendação Executiva</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-[32px] font-bold font-mono" style={{ color: rec.color }}>
            {rec.label}
          </div>
        </div>
        <p className="text-[13px] text-[var(--txt-2)] leading-relaxed mb-4">
          {analysis.summary}
        </p>

        {/* Confidence Notes */}
        <div className="border-t border-[var(--line-soft)] pt-4 mt-4">
          <h4 className="text-xs font-mono tracking-[.06em] uppercase text-[var(--txt-2)] mb-3">Notas de Confiança</h4>
          <ul className="space-y-2">
            {analysis.confidenceNotes.map((note, i) => (
              <li key={i} className="flex gap-2 items-start text-[12.5px] text-[var(--txt-2)]">
                <svg className="w-[15px] h-[15px] flex-none mt-0.5 stroke-[var(--blue-soft)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7"><path d="M5 12l5 5L20 6"/></svg>
                {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Gaps */}
        {analysis.unresolvedGaps.length > 0 && (
          <div className="border-t border-[var(--line-soft)] pt-4 mt-4">
            <h4 className="text-xs font-mono tracking-[.06em] uppercase text-[var(--amber)] mb-3">Lacunas de Validação</h4>
            <ul className="space-y-2">
              {analysis.unresolvedGaps.map((gap, i) => (
                <li key={i} className="flex gap-2 items-start text-[12.5px] text-[var(--txt-2)]">
                  <svg className="w-[15px] h-[15px] flex-none mt-0.5 stroke-[var(--amber)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

const shieldIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 4 6v6c0 4.5 3.5 7.5 8 9 4.5-1.5 8-4.5 8-9V6z"/></svg>;
const scaleIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M9 3h6l4 4v14H5V3z"/><path d="M9 11h6M9 15h6"/></svg>;
const fileIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M7 3h7l5 5v13H7z"/><path d="M9 13h6M9 16h4"/></svg>;
const flagIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M5 3v18M5 4h11l-2 4 2 4H5"/></svg>;
const linkIcon = <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="m7.8 7.6 2.6 7M16.5 9l-3 6"/></svg>;
