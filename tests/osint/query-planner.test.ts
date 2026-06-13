import { describe, expect, it } from 'vitest';
import { buildOsintQueryPlan } from '@/lib/osint/query-planner';

describe('buildOsintQueryPlan', () => {
  it('normaliza alvo e gera queries OSINT determinísticas', () => {
    const plan = buildOsintQueryPlan('  Argus   Eye LTDA  ', new Date('2026-06-13T10:00:00Z'));

    expect(plan.target).toBe('Argus Eye LTDA');
    expect(plan.queries).toContain('"Argus Eye LTDA"');
    expect(plan.queries).toContain('"Argus Eye LTDA" processo OR ação OR tribunal');
    expect(new Set(plan.queries).size).toBe(plan.queries.length);
  });
});
