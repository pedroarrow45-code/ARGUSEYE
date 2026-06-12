import type { RiskData } from '@/lib/types';

interface RedFlagCardProps {
  risk: RiskData;
}

const severityMap: Record<string, string> = {
  CRITICAL: 'border-l-[var(--crit)]',
  HIGH: 'border-l-[var(--red)]',
  MEDIUM: 'border-l-[var(--amber)]',
  LOW: 'border-l-[var(--green)]',
};

const confidenceScore: Record<string, number> = {
  CRITICAL: 82,
  HIGH: 71,
  MEDIUM: 55,
  LOW: 44,
};

export default function RedFlagCard({ risk }: RedFlagCardProps) {
  const conf = confidenceScore[risk.severity] || 50;

  return (
    <div className={`panel p-[17px] transition-all duration-200 cursor-pointer border-l-[3px] ${severityMap[risk.severity]} hover:border-[var(--line)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,.6)]`}>
      <div className="flex items-start justify-between gap-3 mb-[11px]">
        <h4 className="text-sm font-semibold leading-snug">{risk.title}</h4>
        <span className={`sev sev-${risk.severity} flex-none`}>{risk.severity}</span>
      </div>
      <p className="text-xs text-[var(--txt-2)] leading-relaxed mb-[13px]">
        {risk.description}
      </p>
      <div className="flex items-center justify-between gap-[10px]">
        <div className="flex items-center gap-2 text-[11px] text-[var(--txt-3)] font-mono">
          Confiança
          <div className="w-[54px] h-[5px] bg-[var(--ink)] rounded-md overflow-hidden">
            <span className="block h-full bg-gradient-to-r from-[var(--amber)] to-[var(--blue)]" style={{ width: `${conf}%` }} />
          </div>
          {conf}%
        </div>
        {risk.recommendedAction && (
          <span className="text-[11px] text-[var(--blue-soft)] font-mono truncate max-w-[180px]">
            {risk.recommendedAction}
          </span>
        )}
      </div>
    </div>
  );
}
