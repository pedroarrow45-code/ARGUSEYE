import { v4 as uuidv4 } from 'uuid';
import { maskIdentifier } from '@/lib/compliance';
import type { CaseDetail, CaseData, CollectionJobData, CreateCaseInput, EntityData, EvidenceData, RelationshipData, RiskData, TargetData } from '@/lib/types';

type MockCaseInput = CreateCaseInput & {
  id?: string;
  caseNumber?: number;
  identifierMasked?: string;
  createdAt?: Date;
};

function clean(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function makeId(prefix: string): string {
  return `${prefix}-${uuidv4()}`;
}

function buildIdentifier(input: MockCaseInput): string | null {
  const identifier = clean(input.identifierMasked) ?? clean(input.identifier);
  return identifier ? maskIdentifier(identifier) : null;
}

function relatedTermsList(input: MockCaseInput): string[] {
  return (clean(input.relatedTerms) ?? '')
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function generateMockCaseFromInput(input: MockCaseInput): CaseDetail {
  const id = input.id ?? uuidv4();
  const now = input.createdAt ?? new Date();
  const targetName = clean(input.targetName) ?? 'Alvo sem nome';
  const sector = clean(input.sector) ?? (input.targetType === 'COMPANY' ? 'Setor informado pelo usuário' : 'Pessoa física');
  const context = clean(input.context) ?? null;
  const identifierMasked = buildIdentifier(input);
  const terms = relatedTermsList(input);
  const caseNumber = input.caseNumber ?? 1;

  const baseCase: CaseData = {
    id,
    caseName: `DUE-${now.getFullYear()}-${String(caseNumber).padStart(4, '0')}`,
    targetName,
    targetType: input.targetType,
    identifierMasked,
    decisionType: input.decisionType,
    legitimatePurpose: clean(input.legitimatePurpose) ?? 'Finalidade legítima informada no formulário',
    context,
    sector,
    relatedTerms: terms.join(', ') || null,
    collectionStatus: 'MOCK_READY',
    collectionMode: 'DEMO',
    collectionMessage: 'Case mockado derivado do formulário. Nenhuma fonte real consultada.',
    sourcesConsulted: [],
    gaps: ['Conectores reais não acionados neste modo.'],
    status: 'COMPLETED',
    overallRisk: 'MEDIUM',
    recommendation: 'INVESTIGATE_FURTHER',
    createdAt: now,
    updatedAt: now,
  };

  const target: TargetData = {
    id: makeId('target'),
    caseId: id,
    name: targetName,
    type: input.targetType,
    documentMasked: identifierMasked,
    sector,
    notes: context,
    createdAt: now,
  };

  const primaryEntity: EntityData = {
    id: makeId('ent'),
    caseId: id,
    name: targetName,
    type: input.targetType === 'PERSON' ? 'PERSON' : 'COMPANY',
    description: `Entidade principal criada a partir do formulário para ${targetName}.`,
    createdAt: now,
  };

  const relatedCompany: EntityData = {
    id: makeId('ent'),
    caseId: id,
    name: input.targetType === 'COMPANY' ? `${targetName} — Quadro societário` : `${targetName} Participações Simuladas Ltda.`,
    type: 'COMPANY',
    description: `Entidade simulada para mapear vínculos declaratórios associados a ${targetName}.`,
    createdAt: now,
  };

  const courtEntity: EntityData = {
    id: makeId('ent'),
    caseId: id,
    name: `Consulta processual pública — ${targetName}`,
    type: 'LEGAL_CASE',
    description: `Registro simulado de varredura processual para ${targetName}.`,
    createdAt: now,
  };

  const sourceEntity: EntityData = {
    id: makeId('ent'),
    caseId: id,
    name: terms[0] ?? `Fonte pública relacionada a ${targetName}`,
    type: terms[0] ? 'OTHER' : 'DOCUMENT',
    description: `Termo ou fonte relacionado informado pelo usuário para enriquecer a análise de ${targetName}.`,
    createdAt: now,
  };

  const entities = [primaryEntity, relatedCompany, courtEntity, sourceEntity];

  const evidences: EvidenceData[] = [
    {
      id: 'EV-MVP-001',
      caseId: id,
      sourceName: 'Cadastro público simulado',
      sourceUrl: null,
      sourceType: 'COMPANY_REGISTRY',
      accessedAt: now,
      publishedAt: null,
      title: `Perfil cadastral público de ${targetName}`,
      relevantExcerpt: `Evidência simulada criada para o MVP com o alvo ${targetName}.`,
      summary: `${targetName} foi registrado como alvo principal da due diligence com setor ${sector}.`,
      confidence: 'HIGH',
      riskLevel: 'LOW',
      entitiesMentioned: [targetName, relatedCompany.name],
      createdAt: now,
    },
    {
      id: 'EV-MVP-002',
      caseId: id,
      sourceName: 'Diário oficial simulado',
      sourceUrl: null,
      sourceType: 'OFFICIAL_GAZETTE',
      accessedAt: now,
      publishedAt: now,
      title: `Menções públicas simuladas envolvendo ${targetName}`,
      relevantExcerpt: `Foram simuladas menções públicas para permitir avaliação preliminar de ${targetName}.`,
      summary: `Menções públicas de ${targetName} exigem validação humana antes de decisão final.`,
      confidence: 'MEDIUM',
      riskLevel: 'MEDIUM',
      entitiesMentioned: [targetName, sourceEntity.name],
      createdAt: now,
    },
    {
      id: 'EV-MVP-003',
      caseId: id,
      sourceName: 'Consulta processual simulada',
      sourceUrl: null,
      sourceType: 'COURT',
      accessedAt: now,
      publishedAt: null,
      title: `Triagem processual preliminar para ${targetName}`,
      relevantExcerpt: `Resultado simulado para demonstrar fluxo de evidências processuais de ${targetName}.`,
      summary: `A triagem de ${targetName} não substitui consulta oficial aos tribunais.`,
      confidence: 'MEDIUM',
      riskLevel: 'MEDIUM',
      entitiesMentioned: [targetName, courtEntity.name],
      createdAt: now,
    },
    {
      id: 'EV-MVP-004',
      caseId: id,
      sourceName: 'Relatório PDF simulado',
      sourceUrl: null,
      sourceType: 'PDF',
      accessedAt: now,
      publishedAt: null,
      title: `Sumário documental simulado de ${targetName}`,
      relevantExcerpt: `Documento simulado consolida contexto informado pelo usuário sobre ${targetName}.`,
      summary: context ?? `Nenhum contexto adicional foi informado para ${targetName}.`,
      confidence: 'LOW',
      riskLevel: 'LOW',
      entitiesMentioned: [targetName],
      createdAt: now,
    },
  ];

  const relationships: RelationshipData[] = [
    {
      id: makeId('rel'),
      caseId: id,
      sourceEntityId: primaryEntity.id,
      targetEntityId: relatedCompany.id,
      relationshipType: input.targetType === 'COMPANY' ? 'possui quadro societário simulado' : 'vínculo societário simulado',
      evidenceId: evidences[0].id,
      confidence: 'MEDIUM',
      comment: `Relação simulada derivada do cadastro do alvo ${targetName}.`,
      createdAt: now,
    },
    {
      id: makeId('rel'),
      caseId: id,
      sourceEntityId: primaryEntity.id,
      targetEntityId: courtEntity.id,
      relationshipType: 'citado em triagem processual simulada',
      evidenceId: evidences[2].id,
      confidence: 'MEDIUM',
      comment: `Vínculo processual simulado para manter o MVP navegável para ${targetName}.`,
      createdAt: now,
    },
    {
      id: makeId('rel'),
      caseId: id,
      sourceEntityId: primaryEntity.id,
      targetEntityId: sourceEntity.id,
      relationshipType: 'associado a termo relacionado',
      evidenceId: evidences[1].id,
      confidence: terms.length > 0 ? 'HIGH' : 'LOW',
      comment: `Termos relacionados informados: ${terms.join(', ') || 'nenhum'}.`,
      createdAt: now,
    },
  ];

  const risks: RiskData[] = [
    {
      id: makeId('risk'),
      caseId: id,
      title: `Validação independente pendente para ${targetName}`,
      severity: 'MEDIUM',
      description: `As evidências de ${targetName} são simuladas neste MVP e precisam ser substituídas por consultas reais antes de uma decisão vinculante.`,
      evidenceIds: [evidences[0].id, evidences[1].id],
      recommendedAction: `Validar manualmente as fontes públicas e documentos associados a ${targetName}.`,
      createdAt: now,
    },
    {
      id: makeId('risk'),
      caseId: id,
      title: `Escopo documental incompleto de ${targetName}`,
      severity: 'LOW',
      description: `O contexto e os termos relacionados foram capturados, mas a coleta real ainda não foi conectada para ${targetName}.`,
      evidenceIds: [evidences[3].id],
      recommendedAction: 'Complementar com documentação oficial, certidões e validação humana.',
      createdAt: now,
    },
  ];

  const collectionJobs: CollectionJobData[] = [{
    id: makeId('job'),
    caseId: id,
    status: 'COMPLETED',
    startedAt: now,
    completedAt: now,
    errorMessage: null,
    mode: 'DEMO',
    createdAt: now,
    updatedAt: now,
  }];

  return {
    ...baseCase,
    targets: [target],
    evidences,
    entities,
    relationships,
    risks,
    collectionJobs,
  };
}
