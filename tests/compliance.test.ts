import { describe, it, expect } from 'vitest';
import {
  detectInputType,
  isCpf,
  isCnpj,
  maskCpf,
  formatCnpj,
  containsRawCpf,
  normalizeDomain,
  generateNameVariations,
  generateCompanyVariations,
} from '@/lib/compliance';

describe('CPF detection', () => {
  it('detects formatted CPF', () => {
    expect(detectInputType('123.456.789-09')).toBe('CPF');
  });

  it('detects unformatted CPF', () => {
    expect(detectInputType('12345678909')).toBe('CPF');
  });

  it('isCpf returns true for CPF', () => {
    expect(isCpf('123.456.789-09')).toBe(true);
  });

  it('isCpf returns false for non-CPF', () => {
    expect(isCpf('João Silva')).toBe(false);
  });
});

describe('CPF masking', () => {
  it('masks CPF correctly', () => {
    expect(maskCpf('123.456.789-09')).toBe('***.***.***-09');
  });

  it('masks unformatted CPF', () => {
    expect(maskCpf('12345678909')).toBe('***.***.***-09');
  });
});

describe('Raw CPF detection', () => {
  it('detects raw CPF in text', () => {
    expect(containsRawCpf('O CPF 123.456.789-09 foi informado')).toBe(true);
  });

  it('does not flag masked CPF', () => {
    expect(containsRawCpf('CPF mascarado: ***.***.***-09')).toBe(false);
  });

  it('does not flag text without CPF', () => {
    expect(containsRawCpf('Texto normal sem documentos')).toBe(false);
  });
});

describe('CNPJ detection and formatting', () => {
  it('detects formatted CNPJ', () => {
    expect(detectInputType('12.345.678/0001-90')).toBe('CNPJ');
  });

  it('detects unformatted CNPJ', () => {
    expect(detectInputType('12345678000190')).toBe('CNPJ');
  });

  it('isCnpj returns true for CNPJ', () => {
    expect(isCnpj('12.345.678/0001-90')).toBe(true);
  });

  it('formats CNPJ correctly', () => {
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90');
  });
});

describe('Domain detection', () => {
  it('detects domain', () => {
    expect(detectInputType('example.com.br')).toBe('DOMAIN');
  });

  it('normalizes domain', () => {
    expect(normalizeDomain('https://www.example.com/')).toBe('example.com');
  });
});

describe('Name detection', () => {
  it('detects person name', () => {
    expect(detectInputType('João A. Monteiro')).toBe('PERSON_NAME');
  });

  it('detects company name', () => {
    expect(detectInputType('Monteiro Capital Participações Ltda.')).toBe('COMPANY_NAME');
  });
});

describe('Name variations', () => {
  it('generates name variations', () => {
    const vars = generateNameVariations('João Alberto Monteiro');
    expect(vars).toContain('João Alberto Monteiro');
    expect(vars).toContain('João Monteiro');
    expect(vars.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Company variations', () => {
  it('generates company name variations without suffix', () => {
    const vars = generateCompanyVariations('Monteiro Capital Ltda.');
    expect(vars).toContain('Monteiro Capital Ltda.');
    expect(vars.some(v => !v.includes('Ltda'))).toBe(true);
  });
});
