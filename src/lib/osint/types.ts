export interface OsintQueryPlan {
  target: string;
  queries: string[];
  generatedAt: Date;
}

export interface OsintSearchResult {
  title: string;
  url: string;
  snippet: string;
  engine?: string;
  query: string;
  rank: number;
}

export interface OsintLedgerEntry {
  url: string;
  finalUrl?: string;
  normalizedUrl?: string;
  title?: string;
  snippet?: string;
  engine?: string;
  query?: string;
  rank?: number;
  status: 'SEARCH_RESULT' | 'FETCHED' | 'EXTRACTED' | 'SKIPPED' | 'ERROR';
  reason?: string;
  fetchedAt: Date;
  httpStatus?: number;
  contentType?: string;
  contentHash?: string;
}

export interface OsintFetchedDocument {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  html: string;
  fetchedAt: Date;
}

export interface OsintExtractedDocument {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  headings: string[];
  text: string;
  textHash: string;
  excerpt: string;
  fetchedAt: Date;
  status: number;
}

export interface OsintEvidenceCandidate {
  id: string;
  title: string;
  sourceUrl: string;
  excerpt: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  collectedAt: Date;
}

export interface OsintInvestigationResult {
  target: string;
  caseId?: string | null;
  collectionJobId?: string | null;
  generatedAt: Date;
  queries: string[];
  searchResults: OsintSearchResult[];
  ledger: OsintLedgerEntry[];
  documents: OsintExtractedDocument[];
  evidenceCandidates: OsintEvidenceCandidate[];
  reportMarkdown: string;
  limitations: string[];
}
