import type { OsintEvidenceCandidate, OsintExtractedDocument } from '@/lib/osint/types';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function buildEvidenceCandidates(target: string, documents: OsintExtractedDocument[]): OsintEvidenceCandidate[] {
  const targetTokens = normalize(target).split(/\s+/).filter((token) => token.length > 2);

  return documents.map((document, index) => {
    const haystack = normalize(`${document.title} ${document.text}`);
    const matches = targetTokens.filter((token) => haystack.includes(token)).length;
    const coverage = targetTokens.length > 0 ? matches / targetTokens.length : 0;
    const confidence: OsintEvidenceCandidate['confidence'] = coverage >= 0.75 ? 'HIGH' : coverage >= 0.4 ? 'MEDIUM' : 'LOW';

    return {
      id: `ev-candidate-${String(index + 1).padStart(3, '0')}`,
      title: document.title,
      sourceUrl: document.finalUrl,
      excerpt: document.excerpt,
      confidence,
      reason: matches > 0
        ? `Documento menciona ${matches} termo(s) associado(s) ao alvo pesquisado.`
        : 'Documento retornado pela busca, mas requer revisão humana para confirmar relevância.',
      collectedAt: document.fetchedAt,
    };
  });
}
