import type {
  CaseData, TargetData, EvidenceData, EntityData, RelationshipData, RiskData,
  AnalysisResult, DashboardMetrics, GraphData, Recommendation, RiskLevel
} from '../types';

export function analyzeCase(
  caseData: CaseData,
  targets: TargetData[],
  evidences: EvidenceData[],
  entities: EntityData[],
  relationships: RelationshipData[],
  risks: RiskData[]
): AnalysisResult {
  const metrics = computeMetrics(evidences, entities, relationships, risks);
  const graphData = buildGraphData(entities, relationships);
  const recommendation = determineRecommendation(risks, evidences);
  const confidenceNotes = buildConfidenceNotes(evidences, risks);
  const unresolvedGaps = identifyGaps(caseData, evidences, entities);

  const summary = buildSummary(caseData, targets, metrics, recommendation);

  return {
    summary,
    metrics,
    risks,
    recommendation,
    confidenceNotes,
    unresolvedGaps,
    graphData,
  };
}

function computeMetrics(
  evidences: EvidenceData[],
  entities: EntityData[],
  relationships: RelationshipData[],
  risks: RiskData[]
): DashboardMetrics {
  return {
    casesInProgress: 1,
    publicEvidences: evidences.length,
    lawsuitsFound: evidences.filter(e => e.sourceType === 'COURT').length,
    pdfsScanned: evidences.filter(e => e.sourceType === 'PDF').length,
    criticalRedFlags: risks.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length,
    connectionsFound: relationships.length,
  };
}

export function buildGraphData(entities: EntityData[], relationships: RelationshipData[]): GraphData {
  const nodes = entities.map(e => ({
    id: e.id,
    label: e.name,
    type: e.type,
  }));

  const edges = relationships.map(r => ({
    id: r.id,
    source: r.sourceEntityId,
    target: r.targetEntityId,
    label: r.relationshipType,
    confidence: r.confidence,
  }));

  return { nodes, edges };
}

function determineRecommendation(risks: RiskData[], evidences: EvidenceData[]): Recommendation {
  const criticalCount = risks.filter(r => r.severity === 'CRITICAL').length;
  const highCount = risks.filter(r => r.severity === 'HIGH').length;
  const strongEvidenceCount = evidences.filter(e => e.confidence === 'HIGH').length;

  if (criticalCount >= 2) return 'NOT_RECOMMENDED';
  if (criticalCount >= 1 || highCount >= 3) return 'SUSPEND_DECISION';
  if (highCount >= 1) return 'INVESTIGATE_FURTHER';
  if (strongEvidenceCount < evidences.length * 0.5) return 'PROCEED_WITH_CAUTION';
  return 'PROCEED';
}

function buildConfidenceNotes(evidences: EvidenceData[], risks: RiskData[]): string[] {
  const notes: string[] = [];
  const highConfidence = evidences.filter(e => e.confidence === 'HIGH').length;
  const lowConfidence = evidences.filter(e => e.confidence === 'LOW').length;

  notes.push(`${highConfidence} de ${evidences.length} evidências com alta confiança.`);

  if (lowConfidence > 0) {
    notes.push(`${lowConfidence} evidência(s) com baixa confiança requer(em) validação adicional.`);
  }

  if (risks.length > 0) {
    const byLevel: Record<string, number> = {};
    risks.forEach(r => { byLevel[r.severity] = (byLevel[r.severity] || 0) + 1; });
    notes.push(`Riscos identificados: ${Object.entries(byLevel).map(([k, v]) => `${v} ${k}`).join(', ')}.`);
  }

  return notes;
}

function identifyGaps(caseData: CaseData, evidences: EvidenceData[], entities: EntityData[]): string[] {
  const gaps: string[] = [];

  if (evidences.length === 0) {
    gaps.push('Nenhuma evidência pública coletada até o momento.');
  }

  if (entities.length === 0) {
    gaps.push('Nenhuma entidade identificada para construção do mapa de vínculos.');
  }

  const sourceTypes = new Set(evidences.map(e => e.sourceType));
  if (!sourceTypes.has('COURT')) gaps.push('Dados processuais públicos ainda não coletados.');
  if (!sourceTypes.has('COMPANY_REGISTRY')) gaps.push('Consulta a registro comercial pendente.');
  if (!sourceTypes.has('OFFICIAL_GAZETTE')) gaps.push('Varredura de diários oficiais pendente.');

  return gaps;
}

function buildSummary(
  caseData: CaseData,
  targets: TargetData[],
  metrics: DashboardMetrics,
  recommendation: Recommendation
): string {
  const target = targets[0];
  const targetDesc = target ? `${target.name} (${target.type})` : caseData.targetName;
  const recLabels: Record<Recommendation, string> = {
    PROCEED: 'Prosseguir',
    PROCEED_WITH_CAUTION: 'Prosseguir com cautela',
    INVESTIGATE_FURTHER: 'Aprofundar investigação',
    SUSPEND_DECISION: 'Suspender decisão',
    NOT_RECOMMENDED: 'Não recomendado',
  };

  return `Análise de due diligence para ${targetDesc}. ` +
    `${metrics.publicEvidences} evidências públicas coletadas, ` +
    `${metrics.lawsuitsFound} processos localizados, ` +
    `${metrics.criticalRedFlags} red flags detectadas, ` +
    `${metrics.connectionsFound} vínculos mapeados. ` +
    `Recomendação executiva: ${recLabels[recommendation]}.`;
}

export function classifyRisk(severity: RiskLevel): { label: string; color: string } {
  const map: Record<RiskLevel, { label: string; color: string }> = {
    CRITICAL: { label: 'Crítico', color: '#FF3B30' },
    HIGH: { label: 'Alto', color: '#E0533B' },
    MEDIUM: { label: 'Médio', color: '#E8A23D' },
    LOW: { label: 'Baixo', color: '#3FB57A' },
  };
  return map[severity];
}
