const CPF_REGEX = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const CNPJ_REGEX = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export function detectInputType(input: string): 'CPF' | 'CNPJ' | 'PERSON_NAME' | 'COMPANY_NAME' | 'DOMAIN' | 'UNKNOWN' {
  const trimmed = input.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (CPF_REGEX.test(trimmed) || (digitsOnly.length === 11 && /^\d+$/.test(digitsOnly))) {
    return 'CPF';
  }

  if (CNPJ_REGEX.test(trimmed) || (digitsOnly.length === 14 && /^\d+$/.test(digitsOnly))) {
    return 'CNPJ';
  }

  if (DOMAIN_REGEX.test(trimmed)) {
    return 'DOMAIN';
  }

  const companySuffixes = /\b(ltda|s\.?a\.?|me|eireli|epp|s\/s|eirl|ss|slu|holding|participações|participacoes|serviços|servicos)\b/i;
  if (companySuffixes.test(trimmed)) {
    return 'COMPANY_NAME';
  }

  if (/^[A-Za-zÀ-ú\s.'-]+$/.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
    return 'PERSON_NAME';
  }

  return 'UNKNOWN';
}

export function isCpf(input: string): boolean {
  return detectInputType(input) === 'CPF';
}

export function isCnpj(input: string): boolean {
  return detectInputType(input) === 'CNPJ';
}

export function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.***.***-${digits.slice(9, 11)}`;
}

export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function maskIdentifier(input: string): string {
  const type = detectInputType(input);
  if (type === 'CPF') return maskCpf(input);
  if (type === 'CNPJ') return formatCnpj(input);
  return input;
}

export function containsRawCpf(text: string): boolean {
  const cpfPattern = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g;
  const matches = text.match(cpfPattern);
  if (!matches) return false;
  return matches.some(m => {
    const digits = m.replace(/\D/g, '');
    return digits.length === 11 && !m.includes('*');
  });
}

export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
}

export function generateNameVariations(name: string): string[] {
  const variations: string[] = [name];
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    variations.push(`${parts[0]} ${parts[parts.length - 1]}`);
  }

  if (parts.length >= 3) {
    variations.push(`${parts[0]} ${parts.slice(1).map(p => p[0] + '.').join(' ')}`);
  }

  return [...new Set(variations)];
}

export function generateCompanyVariations(name: string): string[] {
  const variations: string[] = [name];
  const suffixes = ['Ltda.', 'LTDA', 'S.A.', 'SA', 'ME', 'EIRELI', 'EPP', 'S/S'];

  for (const suffix of suffixes) {
    const withoutSuffix = name.replace(new RegExp(`\\s*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\.?$`, 'i'), '').trim();
    if (withoutSuffix !== name) {
      variations.push(withoutSuffix);
    }
  }

  return [...new Set(variations)];
}
