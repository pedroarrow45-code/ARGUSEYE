import { COMPLIANCE_BANNER } from '@/lib/compliance';

export default function ComplianceBanner() {
  return (
    <div className="flex items-start gap-[11px] bg-gradient-to-br from-[rgba(47,182,201,.06)] to-transparent border border-[var(--line-soft)] rounded-[var(--r-sm)] p-3 text-[11.5px] text-[var(--txt-2)] leading-relaxed mb-[18px]">
      <svg className="w-[17px] h-[17px] flex-none stroke-[var(--cyan)] mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.7">
        <path d="M12 3 4 6v6c0 4.5 3.5 7.5 8 9 4.5-1.5 8-4.5 8-9V6z"/>
      </svg>
      <div>
        <strong className="text-[var(--txt)] font-semibold">{COMPLIANCE_BANNER}</strong>
      </div>
    </div>
  );
}
