import { v4 as uuidv4 } from 'uuid';
import { fetchCompanyByCnpj, buildBrasilApiEntitiesAndRelationships, buildBrasilApiEvidence, buildBrasilApiRegistryData, classifyCnpjRisk, cleanCnpj, isValidCnpjForLookup, maskCnpjForLog } from '@/lib/connectors/brasilApiCnpjConnector';
import { getMaxResultsPerCase, isBrasilApiEnabled, logRuntimeMode } from '@/lib/config';
import { generateMockCaseFromInput } from '@/lib/mock-case-generator';
import { formatCnpj, maskIdentifier } from '@/lib/compliance';
import type { CaseData, CaseDetail, CollectionJobData, CreateCaseInput, RiskData } from '@/lib/types';

export interface CollectFreeLiveEvidenceOptions {
  id?: string;
  caseNumber?: number;
  createdAt?: Date;
}

export interface CollectFreeLiveEvidenceResult extends CaseDetail {
  recommendation: string | null;
  gaps: string[];
  collectionStatus: NonNullable<CaseData['collectionStatus']>;
}

function clean(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function extractCnpjFromCaseInput(input: CreateCaseInput): string | null {
  const candidates = [input.identifier, input.identifierMasked, input.targetName, input.relatedTerms, input.context]
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const digits = cleanCnpj(candidate);
    if (digits.length === 14) return digits;
  }

  return null;
}

function makeBaseLiveCase(input: CreateCaseInput, options: CollectFreeLiveEvidenceOptions): CaseDetail {
  const id = options.id ?? uuidv4();
  const now = options.createdAt ?? new Date();
  const caseNumber = options.caseNumber ?? 1;
  const targetName = clean(input.targetName) ?? 'Alvo sem nome';
  const cnpj = extractCnpjFromCaseInput(input);
  const rawIdentifier = clean(input.identifierMasked) ?? clean(input.identifier);
  const identifierMasked = cnpj ? formatCnpj(cnpj) : rawIdentifier ? maskIdentifier(rawIdentifier) : null;

  const baseCase: CaseData = {
    id,
    caseName: `DUE-${now.getFullYear()}-${String(caseNumber).padStart(4, '0')}`,
    targetName,
    targetType: input.targetType,
    identifierMasked,
    decisionType: input.decisionType,
    legitimatePurpose: clean(input.legitimatePurpose) ?? 'Finalidade legítima informada no formulário',
    context: clean(input.context) ?? null,
    sector: clean(input.sector) ?? null,
    relatedTerms: clean(input.relatedTerms) ?? null,
    collectionStatus: 'SEARCH_NOT_EXECUTED',
    collectionMode: 'LIVE',
    collectionMessage: 'Consulta real ainda não executada. Informe CNPJ completo de Pessoa Jurídica para acionar a BrasilAPI.',
    sourcesConsulted: [],
    registryData: null,
    gaps: ['Consulta real v0.1 disponível apenas para CNPJ completo de Pessoa Jurídica.'],
    status: 'COMPLETED',
    overallRisk: 'MEDIUM',
    recommendation: 'PROCEED_WITH_CAUTION',
    createdAt: now,
    updatedAt: now,
  };

  const collectionJob: CollectionJobData = {
    id: `job-live-${id}`,
    caseId: id,
    status: 'COMPLETED',
    startedAt: now,
    completedAt: now,
    errorMessage: null,
    mode: 'LIVE',
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...baseCase,
    targets: [{
      id: `target-${id}`,
      caseId: id,
      name: targetName,
      type: input.targetType,
      documentMasked: identifierMasked,
      sector: clean(input.sector) ?? null,
      notes: clean(input.context) ?? null,
      createdAt: now,
    }],
    evidences: [],
    entities: [],
    relationships: [],
    risks: [],
    collectionJobs: [collectionJob],
  };
}

function appendControlledError(caseDetail: CaseDetail, message: string): CollectFreeLiveEvidenceResult {
  const now = caseDetail.createdAt;
  const risk: RiskData = {
    id: `risk-live-error-${caseDetail.id}`,
    caseId: caseDetail.id,
    title: 'Coleta BrasilAPI não concluída',
    severity: 'MEDIUM',
    description: message,
    evidenceIds: [],
    recommendedAction: 'Repetir a consulta e validar manualmente o CNPJ em fonte pública oficial antes da decisão.',
    createdAt: now,
  };

  return {
    ...caseDetail,
    collectionStatus: 'ERROR',
    collectionMessage: message,
    gaps: [message],
    risks: [risk],
    overallRisk: 'MEDIUM',
    recommendation: 'INVESTIGATE_FURTHER',
    collectionJobs: caseDetail.collectionJobs.map((job) => ({ ...job, status: 'FAILED', errorMessage: message, completedAt: now })),
  };
}

export async function collectFreeLiveEvidence(input: CreateCaseInput, options: CollectFreeLiveEvidenceOptions = {}): Promise<CollectFreeLiveEvidenceResult> {
  const flags = logRuntimeMode('Case collection mode');
  const cnpjForLog = extractCnpjFromCaseInput(input);
  if (cnpjForLog) console.info('CNPJ sanitizado', maskCnpjForLog(cnpjForLog));

  if (flags.DEMO_MODE || !flags.LIVE_MODE) {
    const mockCase = generateMockCaseFromInput({ ...input, ...options });
    const collectionMessage = flags.DEMO_MODE
      ? 'DEMO_MODE=true. Case criado com dados mockados derivados do formulário.'
      : 'LIVE_MODE=false. Case criado com dados mockados derivados do formulário.';

    return {
      ...mockCase,
      collectionStatus: 'MOCK_READY',
      collectionMode: 'DEMO',
      collectionMessage,
      recommendation: mockCase.recommendation ?? null,
      sourcesConsulted: [],
      gaps: mockCase.gaps ?? ['Conectores reais desativados.'],
    };
  }

  const baseCase = makeBaseLiveCase(input, options);
  const cnpj = extractCnpjFromCaseInput(input);

  if (input.targetType !== 'COMPANY') {
    console.info('consulta real não executada', { reason: 'unsupported_target_type', targetType: input.targetType });
    console.info('número de evidências reais geradas', 0);
    return {
      ...baseCase,
      collectionStatus: 'SEARCH_NOT_EXECUTED',
      collectionMessage: 'Consulta real não executada: a versão live atual aceita apenas CNPJ de Pessoa Jurídica.',
      recommendation: baseCase.recommendation ?? null,
      gaps: ['Pessoa Física, CPF e busca por nome estão fora do escopo da v0.1 live.'],
    };
  }

  if (!cnpj || !isValidCnpjForLookup(cnpj)) {
    console.info('consulta real não executada', { reason: cnpj ? 'invalid_cnpj' : 'missing_cnpj', targetType: input.targetType });
    console.info('número de evidências reais geradas', 0);
    return {
      ...baseCase,
      collectionStatus: 'SEARCH_NOT_EXECUTED',
      collectionMessage: 'Consulta real não executada: informe um CNPJ completo com 14 dígitos para acionar a BrasilAPI.',
      recommendation: baseCase.recommendation ?? null,
      gaps: ['Informe um CNPJ válido e completo para acionar a consulta BrasilAPI na v0.1 live.'],
    };
  }

  if (!flags.BRASILAPI_ENABLED || !isBrasilApiEnabled()) {
    console.info('número de evidências reais geradas', 0);
    return {
      ...baseCase,
      collectionStatus: 'SEARCH_NOT_EXECUTED',
      collectionMessage: 'Consulta real não executada: BrasilAPI desabilitada por BRASILAPI_ENABLED=false.',
      recommendation: baseCase.recommendation ?? null,
      gaps: ['Habilite BRASILAPI_ENABLED=true para consultar CNPJ na v0.1 live.'],
    };
  }

  const result = await fetchCompanyByCnpj(cnpj);

  if (!result.ok) {
    if (result.status === 404) {
      console.info('número de evidências reais geradas', 0);
      return {
        ...baseCase,
        collectionStatus: 'NO_REAL_EVIDENCE',
        collectionMessage: 'Consulta BrasilAPI executada, mas não retornou cadastro para este CNPJ.',
        sourcesConsulted: ['BrasilAPI'],
        recommendation: baseCase.recommendation ?? null,
        gaps: ['Consulta BrasilAPI executada, mas não retornou cadastro para este CNPJ.'],
      };
    }

    const failedCase = appendControlledError(baseCase, result.error);
    console.info('número de evidências reais geradas', failedCase.evidences.length);
    return failedCase;
  }

  const company = {
    ...result.company,
    qsa: result.company.qsa.slice(0, getMaxResultsPerCase()),
  };
  const registryData = buildBrasilApiRegistryData(company);
  const evidence = buildBrasilApiEvidence(company, baseCase.id);
  const { entities, relationships } = buildBrasilApiEntitiesAndRelationships(company, baseCase.id, evidence.id);
  const riskLevel = classifyCnpjRisk(company.situacaoCadastral);
  const risks: RiskData[] = riskLevel === 'LOW'
    ? []
    : [{
        id: `risk-cnpj-status-${baseCase.id}`,
        caseId: baseCase.id,
        title: `Situação cadastral ${company.situacaoCadastral || 'desconhecida'}`,
        severity: riskLevel,
        description: `A BrasilAPI retornou situação cadastral ${company.situacaoCadastral || 'desconhecida'} para ${company.razaoSocial}.`,
        evidenceIds: [evidence.id],
        recommendedAction: 'Validar o status cadastral na Receita Federal e revisar impactos reputacionais antes de prosseguir.',
        createdAt: company.accessedAt,
      }];

  const liveCase: CollectFreeLiveEvidenceResult = {
    ...baseCase,
    targetName: company.razaoSocial,
    identifierMasked: company.cnpjFormatted,
    collectionStatus: 'BRASILAPI_COMPLETED',
    collectionMode: 'LIVE',
    collectionMessage: 'Consulta BrasilAPI concluída. Resultado preliminar. Requer revisão humana.',
    sourcesConsulted: ['BrasilAPI'],
    registryData,
    gaps: relationships.length > 0 ? ['Resultado preliminar. Requer revisão humana.'] : ['BrasilAPI não retornou QSA para criação de vínculos societários. Resultado preliminar. Requer revisão humana.'],
    targets: [{
      ...baseCase.targets[0],
      name: company.razaoSocial,
      type: 'COMPANY',
      documentMasked: company.cnpjFormatted,
      sector: company.cnaePrincipal,
    }],
    evidences: [evidence],
    entities,
    relationships,
    risks,
    status: 'COMPLETED',
    overallRisk: riskLevel,
    recommendation: riskLevel === 'LOW' ? 'PROCEED_WITH_CAUTION' : 'INVESTIGATE_FURTHER',
    collectionJobs: baseCase.collectionJobs.map((job) => ({ ...job, status: 'COMPLETED', completedAt: company.accessedAt })),
  };

  console.info('número de evidências reais geradas', liveCase.evidences.length);
  return liveCase;
}
