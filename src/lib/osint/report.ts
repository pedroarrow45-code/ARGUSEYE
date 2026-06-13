import type { OsintEvidenceCandidate, OsintExtractedDocument, OsintLedgerEntry } from '@/lib/osint/types';

export interface GenerateMarkdownReportInput {
  target: string;
  generatedAt: Date;
  caseId?: string;
  collectionJobId?: string;
  queries: string[];
  documents: OsintExtractedDocument[];
  evidenceCandidates: OsintEvidenceCandidate[];
  ledger: OsintLedgerEntry[];
  limitations?: string[];
}

function bullet(values: string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- Nenhum item registrado.';
}

export function generateMarkdownReport(input: GenerateMarkdownReportInput): string {
  const limitations = input.limitations ?? [
    'Análise inicial baseada apenas em fontes públicas retornadas pela busca configurada.',
    'Resultados podem conter homônimos, duplicidades, páginas indisponíveis ou conteúdo desatualizado.',
    'Nenhuma conclusão jurídica, reputacional ou investigativa deve ser tomada sem revisão humana.',
  ];

  const sources = input.documents.map((document) => `${document.title} — ${document.finalUrl} — acessado em ${document.fetchedAt.toISOString()}`);
  const evidence = input.evidenceCandidates.map((candidate) => `${candidate.title} (${candidate.confidence}) — ${candidate.sourceUrl}`);
  const ledger = input.ledger.map((entry) => `${entry.status}: ${entry.finalUrl ?? entry.url}${entry.reason ? ` — ${entry.reason}` : ''}${entry.fetchedAt ? ` — ${entry.fetchedAt.toISOString()}` : ''}`);
  const references = input.ledger
    .filter((entry) => entry.finalUrl || entry.url.startsWith('http'))
    .map((entry) => `${entry.title ?? 'Fonte sem título'} — ${entry.finalUrl ?? entry.url} — ${entry.fetchedAt.toISOString()}`);

  return [
    `# Relatório OSINT público — ${input.target}`,
    '',
    `**Data da análise:** ${input.generatedAt.toISOString()}`,
    input.caseId ? `**Case ID:** ${input.caseId}` : '**Case ID:** não persistido',
    input.collectionJobId ? `**CollectionJob ID:** ${input.collectionJobId}` : '**CollectionJob ID:** não persistido',
    '',
    '## Queries executadas',
    bullet(input.queries),
    '',
    '## Fontes consultadas',
    bullet(sources),
    '',
    '## Evidências candidatas',
    bullet(evidence),
    '',
    '## Ledger de fontes',
    bullet(ledger),
    '',
    '## Referências',
    bullet(references),
    '',
    '## Limitações da análise',
    bullet(limitations),
    '',
    '> Este relatório usa apenas fontes públicas acessíveis via HTTP/HTTPS no momento da coleta. Não inclui dados privados, vazados, restritos ou conclusões automatizadas de culpa.',
  ].join('\n');
}
