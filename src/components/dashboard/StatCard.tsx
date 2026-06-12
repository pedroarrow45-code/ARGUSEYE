interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'flat';
  accentColor?: string;
  iconBg?: string;
  iconColor?: string;
}

export default function StatCard({
  icon,
  value,
  label,
  trend,
  trendDirection = 'flat',
  accentColor = 'rgba(59,111,224,.14)',
  iconBg = 'rgba(59,111,224,.12)',
  iconColor = '#5B86E8',
}: StatCardProps) {
  const trendColors = {
    up: 'bg-[rgba(63,181,122,.14)] text-[var(--ok)]',
    down: 'bg-[rgba(224,83,59,.14)] text-[var(--red-soft)]',
    flat: 'bg-[var(--steel)] text-[var(--txt-2)]',
  };

  return (
    <div
      className="panel p-[17px] relative overflow-hidden transition-all duration-200 cursor-default hover:border-[var(--line)] hover:-translate-y-0.5"
    >
      <div
        className="absolute -right-5 -top-5 w-20 h-20 rounded-full opacity-70"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
      />
      <div className="flex items-center justify-between mb-[14px] relative z-[1]">
        <div
          className="w-[34px] h-[34px] rounded-[9px] grid place-items-center"
          style={{ background: iconBg }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        {trend && (
          <span className={`font-mono text-[10.5px] font-semibold px-[7px] py-0.5 rounded-full ${trendColors[trendDirection]}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-[30px] font-bold tracking-tight leading-none relative z-[1] tabular-nums">
        {value}
      </div>
      <div className="text-[11.5px] text-[var(--txt-2)] mt-[7px] relative z-[1]">
        {label}
      </div>
    </div>
  );
}
