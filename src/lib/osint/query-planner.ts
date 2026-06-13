import type { OsintQueryPlan } from '@/lib/osint/types';

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildOsintQueryPlan(target: string, generatedAt = new Date()): OsintQueryPlan {
  const normalizedTarget = normalizeWhitespace(target);
  const quoted = `"${normalizedTarget}"`;
  const queries = [
    quoted,
    `${quoted} processo OR ação OR tribunal`,
    `${quoted} contrato OR licitação OR "diário oficial"`,
    `${quoted} sanção OR inidônea OR irregularidade`,
  ];

  return {
    target: normalizedTarget,
    queries: [...new Set(queries)],
    generatedAt,
  };
}
