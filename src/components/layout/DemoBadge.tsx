'use client';

import { DISCLAIMER } from '@/lib/compliance';

export default function DemoBadge() {
  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-[10px] tracking-[.1em] text-[var(--txt-faint)] bg-[var(--glass-2)] backdrop-blur-[8px] border border-[var(--line-soft)] py-1.5 px-[11px] rounded-full flex items-center gap-[7px]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)]" />
      {DISCLAIMER}
    </div>
  );
}
