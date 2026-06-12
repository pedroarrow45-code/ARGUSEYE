import { describe, expect, it } from 'vitest';
import {
  compareNameSimilarity,
  generateNameSearchQueries,
  normalizeCompanyName,
  normalizePersonName,
  removeCompanySuffixes,
  removeDiacritics,
  resolveCandidatesFromKnownInputs,
  tokenizeName,
} from '@/lib/name-resolution';
import { containsRawCpf } from '@/lib/compliance';

describe('name resolution normalization', () => {
  it('normaliza nome com acento e caixa alta/baixa', () => {
    expect(removeDiacritics('João Ávila')).toBe('Joao Avila');
    expect(normalizePersonName('  JOÃO   ÁVILA  ')).toBe('joao avila');
    expect(normalizePersonName('joão ávila')).toBe(normalizePersonName('JOAO AVILA'));
  });

  it('remove sufixos societários de razão social', () => {
    expect(removeCompanySuffixes('Argus Eye Tecnologia LTDA')).toBe('Argus Eye Tecnologia');
    expect(normalizeCompanyName('ARGUS EYE TECNOLOGIA S.A.')).toBe('argus eye tecnologia');
    expect(normalizeCompanyName('Argus Eye Tecnologia ME')).toBe('argus eye tecnologia');
    expect(normalizeCompanyName('Argus Eye Tecnologia EPP')).toBe('argus eye tecnologia');
  });

  it('tokeniza nome normalizado sem pontuação', () => {
    expect(tokenizeName('Argus-Eye, Tecnologia Ltda.')).toEqual(['argus', 'eye', 'tecnologia', 'ltda']);
  });

  it('gera queries reaproveitando variações existentes', () => {
    const personQueries = generateNameSearchQueries('Maria Fernanda Silva Costa', 'PERSON');
    const companyQueries = generateNameSearchQueries('Argus Eye Tecnologia LTDA', 'COMPANY');

    expect(personQueries).toContain('Maria Costa');
    expect(personQueries).toContain('Maria F. S. C.');
    expect(companyQueries).toContain('Argus Eye Tecnologia');
  });
});

describe('name resolution scoring', () => {
  it('pontua match exato normalizado com score alto', () => {
    const result = compareNameSimilarity('Argus Eye Tecnologia LTDA', 'ARGUS EYE TECNOLOGIA S.A.', 'COMPANY', {
      legalName: 'Argus Eye Tecnologia LTDA',
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.signals.map((signal) => signal.kind)).toContain('EXACT_NORMALIZED_MATCH');
    expect(result.signals.map((signal) => signal.kind)).toContain('LEGAL_NAME_MATCH');
  });

  it('pontua match parcial abaixo de match exato', () => {
    const exact = compareNameSimilarity('Maria Fernanda Silva Costa', 'Maria Fernanda Silva Costa', 'PERSON');
    const partial = compareNameSimilarity('Maria Fernanda Silva Costa', 'Maria Costa', 'PERSON');

    expect(partial.score).toBeGreaterThan(0);
    expect(partial.score).toBeLessThan(exact.score);
    expect(partial.signals.map((signal) => signal.kind)).toContain('TOKEN_OVERLAP');
  });

  it('penaliza nome curto', () => {
    const short = compareNameSimilarity('João', 'João', 'PERSON');

    expect(short.score).toBeLessThan(90);
    expect(short.signals.map((signal) => signal.kind)).toContain('SHORT_NAME_PENALTY');
  });

  it('penaliza empresa com tokens genéricos', () => {
    const generic = compareNameSimilarity('Grupo Brasil Serviços LTDA', 'Grupo Brasil Serviços ME', 'COMPANY');

    expect(generic.signals.map((signal) => signal.kind)).toContain('GENERIC_TOKEN_PENALTY');
    expect(generic.score).toBeLessThan(90);
  });

  it('aplica bônus para nome fantasia compatível', () => {
    const result = compareNameSimilarity('Argus Eye', 'Argus Eye Tecnologia LTDA', 'COMPANY', {
      tradeName: 'Argus Eye',
    });

    expect(result.signals.map((signal) => signal.kind)).toContain('TRADE_NAME_MATCH');
  });
});

describe('resolveCandidatesFromKnownInputs', () => {
  it('não confirma pessoa física automaticamente por nome exato', () => {
    const result = resolveCandidatesFromKnownInputs({
      inputName: 'Maria Fernanda Silva Costa',
      targetType: 'PERSON',
      knownCandidates: [{ displayName: 'Maria Fernanda Silva Costa', sourceName: 'Teste interno' }],
      collectedAt: new Date('2026-06-12T12:00:00Z'),
    });

    expect(result.candidates[0].matchScore).toBeGreaterThanOrEqual(80);
    expect(result.candidates[0].status).toBe('CANDIDATE');
    expect(result.status).toBe('CANDIDATE');
    expect('evidences' in result).toBe(false);
  });

  it('mantém homônimo de pessoa física como ambíguo', () => {
    const result = resolveCandidatesFromKnownInputs({
      inputName: 'João Silva',
      targetType: 'PERSON',
      knownCandidates: [
        { displayName: 'João Silva', sourceName: 'Fonte A' },
        { displayName: 'João Silva', sourceName: 'Fonte B' },
      ],
    });

    expect(result.status).toBe('AMBIGUOUS');
    expect(result.candidates.every((candidate) => candidate.status === 'AMBIGUOUS')).toBe(true);
    expect(result.candidates[0].matchSignals.map((signal) => signal.kind)).toContain('HOMONYM_PENALTY');
  });

  it('confirma pessoa jurídica somente com sinais fortes não ambíguos e documento mascarado', () => {
    const result = resolveCandidatesFromKnownInputs({
      inputName: 'Argus Eye Tecnologia LTDA',
      targetType: 'COMPANY',
      knownCandidates: [{
        displayName: 'ARGUS EYE TECNOLOGIA S.A.',
        legalName: 'Argus Eye Tecnologia LTDA',
        document: '11.222.333/0001-81',
        sourceName: 'Entrada conhecida de teste',
        sourceUrl: 'https://example.test/company',
      }],
    });

    expect(result.status).toBe('CONFIRMED');
    expect(result.candidates[0].status).toBe('CONFIRMED');
    expect(result.candidates[0].documentMasked).toBe('**.***.***/0001-**');
    expect(result.candidates[0].sourceUrl).toBe('https://example.test/company');
  });

  it('score baixo não vira CONFIRMED', () => {
    const result = resolveCandidatesFromKnownInputs({
      inputName: 'Argus Eye Tecnologia LTDA',
      targetType: 'COMPANY',
      knownCandidates: [{
        displayName: 'Empresa Sem Relação Comércio ME',
        document: '11.222.333/0001-81',
        sourceName: 'Entrada conhecida de teste',
      }],
    });

    expect(result.candidates[0].matchScore).toBeLessThan(35);
    expect(result.candidates[0].status).toBe('REJECTED');
    expect(result.status).toBe('REJECTED');
  });

  it('candidato não vira evidência nem entidade confirmada nesta fase', () => {
    const result = resolveCandidatesFromKnownInputs({
      inputName: 'Argus Eye Tecnologia LTDA',
      targetType: 'COMPANY',
      knownCandidates: [{ displayName: 'Argus Eye Tecnologia LTDA', document: '11222333000181' }],
    });

    expect('evidences' in result).toBe(false);
    expect('entities' in result).toBe(false);
    expect(result.notes.join(' ')).toContain('Candidatos não são evidências');
  });

  it('não expõe CPF/CNPJ normalizado no retorno público por padrão', () => {
    const personResult = resolveCandidatesFromKnownInputs({
      inputName: 'Maria Fernanda Silva Costa',
      targetType: 'PERSON',
      knownCandidates: [{ displayName: 'Maria Fernanda Silva Costa', document: '123.456.789-09' }],
    });
    const companyResult = resolveCandidatesFromKnownInputs({
      inputName: 'Argus Eye Tecnologia LTDA',
      targetType: 'COMPANY',
      knownCandidates: [{ displayName: 'Argus Eye Tecnologia LTDA', document: '11.222.333/0001-81' }],
    });
    const serialized = JSON.stringify({ personResult, companyResult });

    expect(personResult.candidates[0].documentMasked).toBe('***.***.***-09');
    expect(companyResult.candidates[0].documentMasked).toBe('**.***.***/0001-**');
    expect(personResult.candidates[0].documentNormalized).toBeUndefined();
    expect(companyResult.candidates[0].documentNormalized).toBeUndefined();
    expect(serialized).not.toContain('12345678909');
    expect(serialized).not.toContain('123.456.789-09');
    expect(serialized).not.toContain('11222333000181');
    expect(serialized).not.toContain('11.222.333/0001-81');
    expect(containsRawCpf(serialized)).toBe(false);
  });

  it('suporta documento normalizado apenas em fluxo interno explícito', () => {
    const result = resolveCandidatesFromKnownInputs({
      inputName: 'Argus Eye Tecnologia LTDA',
      targetType: 'COMPANY',
      includeSensitiveDocument: true,
      knownCandidates: [{ displayName: 'Argus Eye Tecnologia LTDA', document: '11.222.333/0001-81' }],
    });

    expect(result.candidates[0].documentNormalized).toBe('11222333000181');
  });

  it('retorna NOT_FOUND quando não há candidatos conhecidos', () => {
    const result = resolveCandidatesFromKnownInputs({ inputName: 'Nome Inexistente', targetType: 'PERSON' });

    expect(result.status).toBe('NOT_FOUND');
    expect(result.candidates).toEqual([]);
  });

  it('marca grupos e desconhecidos como unsupported sem busca externa', () => {
    const result = resolveCandidatesFromKnownInputs({
      inputName: 'Grupo sem escopo',
      targetType: 'GROUP',
      knownCandidates: [{ displayName: 'Grupo sem escopo' }],
    });

    expect(result.status).toBe('UNSUPPORTED');
  });
});
