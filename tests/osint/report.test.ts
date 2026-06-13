import { describe, expect, it } from 'vitest';
import { generateMarkdownReport } from '@/lib/osint/report';

describe('generateMarkdownReport', () => {
  it('gera relatório Markdown com seções mínimas', () => {
    const report = generateMarkdownReport({
      target: 'Argus Eye LTDA',
      generatedAt: new Date('2026-06-13T10:00:00Z'),
      caseId: 'case-1',
      collectionJobId: 'job-1',
      queries: ['"Argus Eye LTDA"'],
      documents: [{
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        title: 'Fonte pública',
        description: 'Descrição',
        headings: ['Fonte pública'],
        text: 'Texto',
        textHash: 'abc123',
        excerpt: 'Texto',
        fetchedAt: new Date('2026-06-13T10:01:00Z'),
        status: 200,
      }],
      evidenceCandidates: [{
        id: 'ev-1',
        title: 'Fonte pública',
        sourceUrl: 'https://example.com',
        excerpt: 'Texto',
        confidence: 'HIGH',
        reason: 'menciona alvo',
        collectedAt: new Date('2026-06-13T10:01:00Z'),
      }],
      ledger: [{ url: 'https://example.com', status: 'EXTRACTED', fetchedAt: new Date('2026-06-13T10:01:00Z') }],
    });

    expect(report).toContain('# Relatório OSINT público — Argus Eye LTDA');
    expect(report).toContain('**Case ID:** case-1');
    expect(report).toContain('**CollectionJob ID:** job-1');
    expect(report).toContain('## Queries executadas');
    expect(report).toContain('## Fontes consultadas');
    expect(report).toContain('## Evidências candidatas');
    expect(report).toContain('## Referências');
    expect(report).toContain('apenas fontes públicas');
  });
});
