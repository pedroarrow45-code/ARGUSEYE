import type { EntityData, RiskData } from '@/lib/types';

interface RiskRankingProps {
  risks: RiskData[];
  entities: EntityData[];
}

const severityStyles: Record<string, { bar: string; scoreColor: string; lvl: string }> = {
  CRITICAL: { bar: 'bg-gradient-to-r from-[var(--red)] to-[var(--crit)]', scoreColor: 'text-[var(--crit)]', lvl: 'crit' },
  HIGH: { bar: 'bg-gradient-to-r from-[var(--amber)] to-[var(--red)]', scoreColor: 'text-[var(--red-soft)]', lvl: 'alto' },
  MEDIUM: { bar: 'bg-gradient-to-r from-[var(--cyan)] to-[var(--amber)]', scoreColor: 'text-[var(--amber)]', lvl: 'medio' },
  LOW: { bar: 'bg-gradient-to-r from-[var(--green)] to-[var(--cyan)]', scoreColor: 'text-[var(--ok)]', lvl: 'baixo' },
};

export default function RiskRanking({ risks }: RiskRankingProps) {
  const sortedRisks = [...risks].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });

  const scoreMap: Record<string, number> = { CRITICAL: 84, HIGH: 71, MEDIUM: 52, LOW: 34 };

  return (
    <div className="panel">
      <div className="flex items-center justify-between p-[15px_18px] border-b border-[var(--line-soft)]">
        <h3 className="text-sm font-semibold flex items-center gap-[9px]">
          <svg className="w-4 h-4 stroke-[var(--txt-2)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7">
            <path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>
          </svg>
          Ranking de Risco
        </h3>
        <span className="text-[11px] text-[var(--txt-3)] font-mono">{risks.length} riscos · exposição pública</span>
      </div>
      <div className="p-[18px]">
        {sortedRisks.map((risk, i) => {
          const style = severityStyles[risk.severity];
          const score = scoreMap[risk.severity] || 50;
          return (
            <div key={risk.id} className={`flex items-center gap-[14px] py-3 ${i < sortedRisks.length - 1 ? 'border-b border-[var(--line-soft)]' : ''}`}>
              <span className="font-mono text-xs text-[var(--txt-3)] w-[22px]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold flex items-center gap-[7px]">
                  {risk.title}
                  <span className={`sev sev-${risk.severity}`}>{risk.severity}</span>
                </div>
                <div className="text-[11px] text-[var(--txt-3)] font-mono mt-0.5 truncate">
                  {risk.description.slice(0, 60)}...
                </div>
              </div>
              <div className="w-[120px] h-1.5 bg-[var(--ink)] rounded-md overflow-hidden flex-none">
                <span className={`block h-full rounded-md ${style.bar}`} style={{ width: `${score}%` }} />
              </div>
              <span className={`font-mono text-[13px] font-semibold w-[38px] text-right ${style.scoreColor}`}>
                {score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
