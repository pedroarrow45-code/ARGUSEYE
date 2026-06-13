import { describe, expect, it } from 'vitest';
import { buildEvidenceCandidates } from '@/lib/osint/evidence';

const fetchedAt = new Date('2026-06-13T10:00:00Z');

describe('buildEvidenceCandidates', () => {
  it('gera candidatos com confiança baseada em cobertura do alvo', () => {
    const candidates = buildEvidenceCandidates('Argus Eye LTDA', [{
      url: 'https://example.com',
      finalUrl: 'https://example.com',
      title: 'Argus Eye LTDA em fonte pública',
      description: 'Descrição',
      headings: ['Argus Eye LTDA'],
      text: 'Documento público menciona Argus Eye LTDA em contexto institucional.',
      textHash: 'abc123',
      excerpt: 'Documento público menciona Argus Eye LTDA.',
      fetchedAt,
      status: 200,
    }]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].confidence).toBe('HIGH');
    expect(candidates[0].reason).toContain('termo');
  });
});
