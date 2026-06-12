import type { CnpjRegistryData, Confidence, EntityData, EvidenceData, RelationshipData, RiskLevel } from '@/lib/types';
import { formatCnpj } from '@/lib/compliance';

const BRASILAPI_CNPJ_BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';

export interface BrasilApiQsaMember {
  nome: string;
  qualificacao: string;
}

export interface NormalizedBrasilApiCompany {
  cnpj: string;
  cnpjFormatted: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  cnaePrincipal: string | null;
  municipio: string | null;
  uf: string | null;
  capitalSocial: number | null;
  qsa: BrasilApiQsaMember[];
  sourceUrl: string;
  accessedAt: Date;
  raw: Record<string, unknown>;
}

export type BrasilApiCnpjResult =
  | { ok: true; company: NormalizedBrasilApiCompany }
  | { ok: false; error: string; status?: number; sourceUrl?: string };

type BrasilApiRawQsa = {
  nome_socio?: unknown;
  nome?: unknown;
  qualificacao_socio?: unknown;
  qualificacao?: unknown;
};

type BrasilApiRawCompany = {
  cnpj?: unknown;
  razao_social?: unknown;
  nome_fantasia?: unknown;
  descricao_situacao_cadastral?: unknown;
  situacao_cadastral?: unknown;
  cnae_fiscal_descricao?: unknown;
  cnae_fiscal?: unknown;
  municipio?: unknown;
  uf?: unknown;
  capital_social?: unknown;
  qsa?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const normalized = Number(value.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

export function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function maskCnpjForLog(cnpj: string): string {
  const digits = cleanCnpj(cnpj);
  if (digits.length !== 14) return 'CNPJ_INVALIDO';
  return `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-**`;
}

export function isValidCnpjForLookup(cnpj: string): boolean {
  return cleanCnpj(cnpj).length === 14;
}

export function getBrasilApiCnpjUrl(cnpj: string): string {
  return `${BRASILAPI_CNPJ_BASE_URL}/${cleanCnpj(cnpj)}`;
}

export function classifyCnpjRisk(situacao: string | null | undefined): RiskLevel {
  const normalized = situacao?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

  if (!normalized) return 'MEDIUM';
  if (normalized.includes('ATIVA')) return 'LOW';
  if (['INAPTA', 'BAIXADA', 'SUSPENSA', 'NULA', 'IRREGULAR'].some((term) => normalized.includes(term))) return 'HIGH';
  return 'MEDIUM';
}

export function normalizeBrasilApiCnpjResponse(raw: BrasilApiRawCompany, sourceUrl: string, accessedAt = new Date()): NormalizedBrasilApiCompany | null {
  const cnpj = asString(raw.cnpj);
  const razaoSocial = asString(raw.razao_social);

  if (!cnpj || !isValidCnpjForLookup(cnpj) || !razaoSocial) {
    return null;
  }

  const qsa = Array.isArray(raw.qsa)
    ? raw.qsa
        .map((member): BrasilApiQsaMember | null => {
          const item = member as BrasilApiRawQsa;
          const nome = asString(item.nome_socio) ?? asString(item.nome);
          const qualificacao = asString(item.qualificacao_socio) ?? asString(item.qualificacao) ?? 'sócio de';
          return nome ? { nome, qualificacao } : null;
        })
        .filter((member): member is BrasilApiQsaMember => Boolean(member))
    : [];

  return {
    cnpj: cleanCnpj(cnpj),
    cnpjFormatted: formatCnpj(cnpj),
    razaoSocial,
    nomeFantasia: asString(raw.nome_fantasia),
    situacaoCadastral: asString(raw.descricao_situacao_cadastral) ?? asString(raw.situacao_cadastral),
    cnaePrincipal: asString(raw.cnae_fiscal_descricao) ?? asString(raw.cnae_fiscal),
    municipio: asString(raw.municipio),
    uf: asString(raw.uf),
    capitalSocial: asNumber(raw.capital_social),
    qsa,
    sourceUrl,
    accessedAt,
    raw: raw as Record<string, unknown>,
  };
}

export function buildBrasilApiRegistryData(company: NormalizedBrasilApiCompany): CnpjRegistryData {
  return {
    sourceName: 'BrasilAPI',
    sourceUrl: company.sourceUrl,
    cnpjMasked: company.cnpjFormatted,
    legalName: company.razaoSocial,
    tradeName: company.nomeFantasia,
    registrationStatus: company.situacaoCadastral,
    primaryActivity: company.cnaePrincipal,
    city: company.municipio,
    state: company.uf,
    capitalSocial: company.capitalSocial,
    accessedAt: company.accessedAt,
  };
}

export function buildBrasilApiEvidence(company: NormalizedBrasilApiCompany, caseId: string): EvidenceData {
  const riskLevel = classifyCnpjRisk(company.situacaoCadastral);
  const location = [company.municipio, company.uf].filter(Boolean).join('/');
  const capital = company.capitalSocial !== null
    ? ` Capital social: ${company.capitalSocial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
    : '';

  return {
    id: 'EV-BRASILAPI-CNPJ-001',
    caseId,
    sourceName: 'BrasilAPI',
    sourceUrl: company.sourceUrl,
    sourceType: 'COMPANY_REGISTRY',
    accessedAt: company.accessedAt,
    publishedAt: null,
    title: `Consulta cadastral CNPJ - ${company.razaoSocial}`,
    relevantExcerpt: `Registro público consultado via BrasilAPI para CNPJ ${company.cnpjFormatted}.`,
    summary: `Razão social: ${company.razaoSocial}. Nome fantasia: ${company.nomeFantasia || 'não informado'}. Situação cadastral: ${company.situacaoCadastral || 'desconhecida'}. CNAE: ${company.cnaePrincipal || 'não informado'}. Município/UF: ${location || 'não informado'}.${capital}`,
    confidence: 'HIGH' as Confidence,
    riskLevel,
    entitiesMentioned: [company.razaoSocial, ...company.qsa.map((member) => member.nome)],
    createdAt: company.accessedAt,
  };
}

export function buildBrasilApiEntitiesAndRelationships(company: NormalizedBrasilApiCompany, caseId: string, evidenceId: string): {
  companyEntity: EntityData;
  entities: EntityData[];
  relationships: RelationshipData[];
} {
  const now = company.accessedAt;
  const companyEntity: EntityData = {
    id: `ent-company-${company.cnpj}`,
    caseId,
    name: company.razaoSocial,
    type: 'COMPANY',
    description: `CNPJ ${company.cnpjFormatted}. Situação cadastral: ${company.situacaoCadastral || 'desconhecida'}. Atividade principal: ${company.cnaePrincipal || 'não informada'}.`,
    createdAt: now,
  };

  const partnerEntities: EntityData[] = company.qsa.map((member, index) => ({
    id: `ent-qsa-${index + 1}-${caseId}`,
    caseId,
    name: member.nome,
    type: 'PERSON',
    description: `QSA BrasilAPI: ${member.qualificacao}. Documento pessoal não armazenado.`,
    createdAt: now,
  }));

  const relationships: RelationshipData[] = partnerEntities.map((entity, index) => {
    const qualificacao = company.qsa[index]?.qualificacao || 'sócio de';
    const normalized = qualificacao.toLowerCase();
    const relationshipType = normalized.includes('admin') ? 'administrador de' : normalized.includes('sócio') || normalized.includes('socio') ? 'sócio de' : qualificacao;

    return {
      id: `rel-qsa-${index + 1}-${caseId}`,
      caseId,
      sourceEntityId: entity.id,
      targetEntityId: companyEntity.id,
      relationshipType,
      evidenceId,
      confidence: 'HIGH',
      comment: `Vínculo informado no QSA retornado pela BrasilAPI: ${qualificacao}.`,
      createdAt: now,
    };
  });

  return {
    companyEntity,
    entities: [companyEntity, ...partnerEntities],
    relationships,
  };
}

export async function fetchCompanyByCnpj(cnpj: string): Promise<BrasilApiCnpjResult> {
  const sanitizedCnpj = cleanCnpj(cnpj);
  console.info('CNPJ sanitizado', maskCnpjForLog(sanitizedCnpj));

  if (!isValidCnpjForLookup(cnpj)) {
    return { ok: false, error: 'CNPJ inválido: informe exatamente 14 dígitos.' };
  }

  const sourceUrl = getBrasilApiCnpjUrl(cnpj);

  try {
    console.info('BrasilAPI request started', { cnpj: maskCnpjForLog(sanitizedCnpj) });
    const response = await fetch(sourceUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 404) {
      console.info('BrasilAPI request completed', { cnpj: maskCnpjForLog(sanitizedCnpj), status: response.status, ok: false });
      return { ok: false, error: 'CNPJ não encontrado na BrasilAPI. A consulta foi executada, mas não retornou evidência cadastral.', status: 404, sourceUrl };
    }

    if (!response.ok) {
      console.info('BrasilAPI request completed', { cnpj: maskCnpjForLog(sanitizedCnpj), status: response.status, ok: false });
      return { ok: false, error: 'Fonte BrasilAPI indisponível ou retornou erro HTTP. Tente novamente mais tarde.', status: response.status, sourceUrl };
    }

    const raw = await response.json() as BrasilApiRawCompany;
    const company = normalizeBrasilApiCnpjResponse(raw, sourceUrl);

    if (!company) {
      console.info('BrasilAPI request completed', { cnpj: maskCnpjForLog(sanitizedCnpj), status: response.status, ok: false });
      return { ok: false, error: 'Fonte BrasilAPI indisponível ou retornou erro HTTP. Tente novamente mais tarde.', status: response.status, sourceUrl };
    }

    console.info('BrasilAPI request completed', { cnpj: maskCnpjForLog(sanitizedCnpj), status: response.status, ok: true });
    return { ok: true, company };
  } catch (error) {
    console.info('BrasilAPI request completed', {
      cnpj: maskCnpjForLog(sanitizedCnpj),
      ok: false,
      error: error instanceof Error ? error.message : 'erro desconhecido',
    });
    return { ok: false, error: 'Fonte BrasilAPI indisponível. A consulta real foi tentada, mas não retornou dados.', sourceUrl };
  }
}
