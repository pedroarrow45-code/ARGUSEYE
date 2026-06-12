import { detectInputType, generateCompanyVariations, generateNameVariations, maskCpf } from '@/lib/compliance';
import type { CandidateConfidence, MatchSignal, NameResolutionCandidate, NameResolutionResult, NameResolutionStatus, TargetType } from '@/lib/types';

const COMPANY_SUFFIX_PATTERN = /\b(ltda|limitada|s\.?\s*a\.?|sa|s\/a|me|epp|eireli|slu|ss|s\/s|holding|participa(?:ç|c)ões?|servi(?:ç|c)os?|com[eé]rcio|industria|ind[uú]stria)\b/gi;
const GENERIC_TOKEN_SET = new Set([
  'a', 'as', 'e', 'o', 'os', 'da', 'de', 'do', 'das', 'dos', 'di', 'du',
  'the', 'and', 'company', 'companhia', 'grupo', 'holding', 'participacoes',
  'participacao', 'servicos', 'servico', 'comercio', 'industria', 'consultoria',
  'empreendimentos', 'investimentos', 'capital', 'brasil', 'sa', 's', 'a',
  'ltda', 'limitada', 'me', 'epp', 'eireli', 'slu', 'ss',
]);

interface KnownCandidateInput {
  displayName: string;
  targetType?: TargetType;
  sourceName?: string;
  sourceUrl?: string | null;
  document?: string;
  legalName?: string;
  tradeName?: string;
  collectedAt?: Date;
}

export interface ResolveCandidatesFromKnownInputsInput {
  inputName: string;
  targetType: TargetType;
  knownCandidates?: KnownCandidateInput[];
  collectedAt?: Date;
  includeSensitiveDocument?: boolean;
}

export interface NameSimilarityScore {
  score: number;
  signals: MatchSignal[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeBaseName(value: string): string {
  return normalizeWhitespace(removeDiacritics(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' '));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

function uniqueSignals(signals: MatchSignal[]): MatchSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.kind}:${signal.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function removeCompanySuffixes(value: string): string {
  return normalizeWhitespace(value.replace(COMPANY_SUFFIX_PATTERN, ' ').replace(/[.,-]+$/g, ''));
}

export function normalizePersonName(value: string): string {
  return normalizeBaseName(value);
}

export function normalizeCompanyName(value: string): string {
  return normalizeBaseName(removeCompanySuffixes(value));
}

export function tokenizeName(value: string): string[] {
  const normalized = normalizeBaseName(value);
  return normalized.split(' ').filter(Boolean);
}

function meaningfulTokens(value: string): string[] {
  return tokenizeName(value).filter((token) => token.length > 1 && !GENERIC_TOKEN_SET.has(token));
}

function genericTokenCount(value: string): number {
  return tokenizeName(value).filter((token) => GENERIC_TOKEN_SET.has(token)).length;
}

function isShortOrWeakName(value: string, targetType: TargetType): boolean {
  const tokens = meaningfulTokens(value);
  if (targetType === 'PERSON') return tokens.length < 2 || tokens.join('').length < 6;
  return tokens.length < 1 || tokens.join('').length < 4;
}

function normalizedForTarget(value: string, targetType: TargetType): string {
  return targetType === 'COMPANY' ? normalizeCompanyName(value) : normalizePersonName(value);
}

function documentMasked(document: string | undefined): string | undefined {
  const digits = document?.replace(/\D/g, '') ?? '';
  if (digits.length === 11) return maskCpf(digits);
  if (digits.length === 14) return `**.***.***/${digits.slice(8, 12)}-**`;
  const cleaned = document?.trim();
  return cleaned || undefined;
}

function documentNormalized(document: string | undefined): string | undefined {
  const digits = document?.replace(/\D/g, '') ?? '';
  return digits.length === 11 || digits.length === 14 ? digits : undefined;
}

function candidateId(index: number, displayName: string, sourceName: string): string {
  const slug = normalizeBaseName(`${displayName} ${sourceName}`).replace(/\s+/g, '-').slice(0, 72) || 'candidate';
  return `name-candidate-${index + 1}-${slug}`;
}

function confidenceForScore(score: number, status: NameResolutionStatus): CandidateConfidence {
  if (status === 'CONFIRMED' || score >= 85) return 'HIGH';
  if (score >= 55) return 'MEDIUM';
  return 'LOW';
}

function hasStrongCompanySignal(signals: MatchSignal[]): boolean {
  return signals.some((signal) => ['EXACT_NORMALIZED_MATCH', 'LEGAL_NAME_MATCH', 'TRADE_NAME_MATCH'].includes(signal.kind) && signal.weight > 0);
}

export function generateNameSearchQueries(name: string, targetType: TargetType): string[] {
  const detected = detectInputType(name);
  const variations = targetType === 'COMPANY' || detected === 'COMPANY_NAME'
    ? generateCompanyVariations(name)
    : generateNameVariations(name);

  const normalized = targetType === 'COMPANY' ? normalizeCompanyName(name) : normalizePersonName(name);
  return unique([
    name,
    ...variations,
    normalized,
    removeCompanySuffixes(name),
  ]).slice(0, 8);
}

export function compareNameSimilarity(inputName: string, candidateName: string, targetType: TargetType, candidateDetails: { legalName?: string; tradeName?: string } = {}): NameSimilarityScore {
  const inputNormalized = normalizedForTarget(inputName, targetType);
  const candidateNormalized = normalizedForTarget(candidateName, targetType);
  const inputTokens = meaningfulTokens(inputName);
  const candidateTokens = meaningfulTokens(candidateName);
  const inputTokenSet = new Set(inputTokens);
  const candidateTokenSet = new Set(candidateTokens);
  const sharedTokens = [...inputTokenSet].filter((token) => candidateTokenSet.has(token));
  const unionTokens = new Set([...inputTokens, ...candidateTokens]);
  const tokenRatio = unionTokens.size > 0 ? sharedTokens.length / unionTokens.size : 0;
  const inputCoverage = inputTokenSet.size > 0 ? sharedTokens.length / inputTokenSet.size : 0;
  const candidateCoverage = candidateTokenSet.size > 0 ? sharedTokens.length / candidateTokenSet.size : 0;
  const signals: MatchSignal[] = [];
  let score = 0;

  if (inputNormalized && inputNormalized === candidateNormalized) {
    score += 72;
    signals.push({ kind: 'EXACT_NORMALIZED_MATCH', description: 'Nome normalizado do candidato é idêntico ao nome de entrada.', weight: 72 });
  }

  if (sharedTokens.length > 0) {
    const tokenScore = Math.round((tokenRatio * 34) + (Math.min(inputCoverage, candidateCoverage) * 14));
    score += tokenScore;
    signals.push({ kind: 'TOKEN_OVERLAP', description: `Tokens relevantes compartilhados: ${sharedTokens.join(', ')}.`, weight: tokenScore });
  }

  const genericPenalty = Math.min(18, genericTokenCount(candidateName) * 4 + genericTokenCount(inputName) * 2);
  if (genericPenalty > 0) {
    score -= genericPenalty;
    signals.push({ kind: 'GENERIC_TOKEN_PENALTY', description: 'Tokens genéricos reduzem confiança do pareamento por nome.', weight: -genericPenalty });
  }

  if (isShortOrWeakName(inputName, targetType) || isShortOrWeakName(candidateName, targetType)) {
    const penalty = targetType === 'PERSON' ? 40 : 16;
    score -= penalty;
    signals.push({ kind: 'SHORT_NAME_PENALTY', description: 'Nome curto ou pouco distintivo aumenta risco de homônimo.', weight: -penalty });
  }

  if (targetType === 'COMPANY' && candidateDetails.legalName) {
    const legalNormalized = normalizeCompanyName(candidateDetails.legalName);
    if (inputNormalized && legalNormalized === inputNormalized) {
      score += 20;
      signals.push({ kind: 'LEGAL_NAME_MATCH', description: 'Razão social normalizada compatível com a entrada.', weight: 20 });
    }
  }

  if (targetType === 'COMPANY' && candidateDetails.tradeName) {
    const tradeNormalized = normalizeCompanyName(candidateDetails.tradeName);
    if (inputNormalized && tradeNormalized === inputNormalized) {
      score += 12;
      signals.push({ kind: 'TRADE_NAME_MATCH', description: 'Nome fantasia normalizado compatível com a entrada.', weight: 12 });
    }
  }

  return {
    score: clampScore(score),
    signals: uniqueSignals(signals),
  };
}

export function resolveCandidatesFromKnownInputs(input: ResolveCandidatesFromKnownInputsInput): NameResolutionResult {
  const collectedAt = input.collectedAt ?? new Date();
  const normalizedInputName = normalizedForTarget(input.inputName, input.targetType);
  const candidates = (input.knownCandidates ?? []).map((known, index): NameResolutionCandidate => {
    const candidateTargetType = known.targetType ?? input.targetType;
    const { score, signals } = compareNameSimilarity(input.inputName, known.displayName, candidateTargetType, {
      legalName: known.legalName,
      tradeName: known.tradeName,
    });
    const masked = documentMasked(known.document);
    const normalizedDocument = documentNormalized(known.document);
    const status: NameResolutionStatus = score < 35 ? 'REJECTED' : 'CANDIDATE';

    return {
      candidateId: candidateId(index, known.displayName, known.sourceName ?? 'Known input'),
      inputName: input.inputName,
      displayName: known.displayName,
      normalizedName: normalizedForTarget(known.displayName, candidateTargetType),
      targetType: candidateTargetType,
      sourceName: known.sourceName ?? 'Known input',
      sourceUrl: known.sourceUrl ?? null,
      matchScore: score,
      matchSignals: signals,
      confidence: confidenceForScore(score, status),
      status,
      collectedAt: known.collectedAt ?? collectedAt,
      documentMasked: masked,
      ...(input.includeSensitiveDocument && normalizedDocument ? { documentNormalized: normalizedDocument } : {}),
    };
  });

  const byNormalizedName = new Map<string, number>();
  for (const candidate of candidates) {
    byNormalizedName.set(candidate.normalizedName, (byNormalizedName.get(candidate.normalizedName) ?? 0) + 1);
  }

  const resolvedCandidates = candidates.map((candidate): NameResolutionCandidate => {
    if (candidate.status === 'REJECTED') {
      return { ...candidate, confidence: confidenceForScore(candidate.matchScore, 'REJECTED') };
    }

    const ambiguousByDuplicate = (byNormalizedName.get(candidate.normalizedName) ?? 0) > 1;
    const ambiguousByShortPerson = candidate.targetType === 'PERSON' && isShortOrWeakName(candidate.displayName, candidate.targetType);

    if (candidate.targetType === 'PERSON') {
      const status: NameResolutionStatus = ambiguousByDuplicate || ambiguousByShortPerson ? 'AMBIGUOUS' : 'CANDIDATE';
      return {
        ...candidate,
        status,
        confidence: confidenceForScore(candidate.matchScore, status),
        matchSignals: ambiguousByDuplicate
          ? uniqueSignals([...candidate.matchSignals, { kind: 'HOMONYM_PENALTY', description: 'Mais de um candidato com o mesmo nome normalizado; confirmação automática bloqueada.', weight: -30 }])
          : candidate.matchSignals,
      };
    }

    if (ambiguousByDuplicate) {
      return {
        ...candidate,
        status: 'AMBIGUOUS',
        confidence: confidenceForScore(candidate.matchScore, 'AMBIGUOUS'),
        matchSignals: uniqueSignals([...candidate.matchSignals, { kind: 'HOMONYM_PENALTY', description: 'Mais de um candidato empresarial com o mesmo nome normalizado.', weight: -24 }]),
      };
    }

    const canConfirmCompany = candidate.targetType === 'COMPANY'
      && candidate.matchScore >= 90
      && hasStrongCompanySignal(candidate.matchSignals)
      && Boolean(candidate.documentMasked);

    const status: NameResolutionStatus = canConfirmCompany ? 'CONFIRMED' : 'CANDIDATE';
    return {
      ...candidate,
      status,
      confidence: confidenceForScore(candidate.matchScore, status),
    };
  });

  const status: NameResolutionStatus = input.targetType === 'GROUP' || input.targetType === 'UNKNOWN'
    ? 'UNSUPPORTED'
    : resolvedCandidates.length === 0
      ? 'NOT_FOUND'
      : resolvedCandidates.some((candidate) => candidate.status === 'CONFIRMED')
        ? 'CONFIRMED'
        : resolvedCandidates.some((candidate) => candidate.status === 'AMBIGUOUS')
          ? 'AMBIGUOUS'
          : resolvedCandidates.every((candidate) => candidate.status === 'REJECTED')
            ? 'REJECTED'
            : 'CANDIDATE';

  return {
    inputName: input.inputName,
    normalizedInputName,
    targetType: input.targetType,
    status,
    candidates: resolvedCandidates,
    generatedAt: collectedAt,
    notes: [
      'Resolução name-first fase 0: somente entradas conhecidas/testáveis; nenhuma busca externa executada.',
      'Candidatos não são evidências e não representam entidades confirmadas sem sinais determinísticos.',
    ],
  };
}
