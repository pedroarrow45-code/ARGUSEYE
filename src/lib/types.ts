export type TargetType = 'PERSON' | 'COMPANY' | 'GROUP' | 'UNKNOWN';
export type DecisionType = 'SOCIETY' | 'M_AND_A' | 'CREDIT' | 'LITIGATION' | 'HIRING' | 'PARTNERSHIP' | 'INVESTMENT' | 'OTHER';
export type CaseStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type EntityType = 'PERSON' | 'COMPANY' | 'PUBLIC_BODY' | 'LEGAL_CASE' | 'CONTRACT' | 'ADDRESS' | 'DOCUMENT' | 'WEBSITE' | 'OTHER';
export type SourceType = 'WEB' | 'NEWS' | 'PDF' | 'COURT' | 'OFFICIAL_GAZETTE' | 'COMPANY_REGISTRY' | 'PUBLIC_CONTRACT' | 'PROFESSIONAL_NETWORK' | 'OTHER';
export type JobMode = 'DEMO' | 'LIVE';
export type CollectionStatus = 'MOCK_READY' | 'BRASILAPI_COMPLETED' | 'NO_REAL_EVIDENCE' | 'ERROR';

export type Recommendation = 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'INVESTIGATE_FURTHER' | 'SUSPEND_DECISION' | 'NOT_RECOMMENDED';

export interface CaseData {
  id: string;
  caseName: string;
  targetName: string;
  targetType: TargetType;
  identifierMasked?: string | null;
  decisionType: DecisionType;
  legitimatePurpose: string;
  context?: string | null;
  sector?: string | null;
  relatedTerms?: string | null;
  collectionStatus?: CollectionStatus | null;
  collectionMessage?: string | null;
  sourcesConsulted?: string[];
  gaps?: string[];
  status: CaseStatus;
  overallRisk?: RiskLevel | null;
  recommendation?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TargetData {
  id: string;
  caseId: string;
  name: string;
  type: TargetType;
  documentMasked?: string | null;
  sector?: string | null;
  notes?: string | null;
  createdAt: Date;
}

export interface EvidenceData {
  id: string;
  caseId: string;
  sourceName: string;
  sourceUrl?: string | null;
  sourceType: SourceType;
  accessedAt: Date;
  publishedAt?: Date | null;
  title: string;
  relevantExcerpt?: string | null;
  summary?: string | null;
  confidence: Confidence;
  riskLevel?: RiskLevel | null;
  entitiesMentioned: string[];
  createdAt: Date;
}

export interface EntityData {
  id: string;
  caseId: string;
  name: string;
  type: EntityType;
  description?: string | null;
  createdAt: Date;
}

export interface RelationshipData {
  id: string;
  caseId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  evidenceId?: string | null;
  confidence: Confidence;
  comment?: string | null;
  createdAt: Date;
}

export interface RiskData {
  id: string;
  caseId: string;
  title: string;
  severity: RiskLevel;
  description: string;
  evidenceIds: string[];
  recommendedAction?: string | null;
  createdAt: Date;
}

export interface CollectionJobData {
  id: string;
  caseId: string;
  status: CaseStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  mode: JobMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseDetail extends CaseData {
  targets: TargetData[];
  evidences: EvidenceData[];
  entities: EntityData[];
  relationships: RelationshipData[];
  risks: RiskData[];
  collectionJobs: CollectionJobData[];
}

export interface AnalysisResult {
  summary: string;
  metrics: DashboardMetrics;
  risks: RiskData[];
  recommendation: Recommendation;
  confidenceNotes: string[];
  unresolvedGaps: string[];
  graphData: GraphData;
}

export interface DashboardMetrics {
  casesInProgress: number;
  publicEvidences: number;
  lawsuitsFound: number;
  pdfsScanned: number;
  criticalRedFlags: number;
  connectionsFound: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence: Confidence;
}

export interface CreateCaseInput {
  targetName: string;
  targetType: TargetType;
  identifier?: string;
  identifierMasked?: string;
  decisionType: DecisionType;
  legitimatePurpose: string;
  context?: string;
  sector?: string;
  relatedTerms?: string;
}
