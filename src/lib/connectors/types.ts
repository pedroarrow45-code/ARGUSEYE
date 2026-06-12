export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: Date;
}

export interface SearchConnector {
  name: string;
  search(query: string): Promise<SearchResult[]>;
}

export interface ExtractedEvidence {
  title: string;
  excerpt: string;
  entities: string[];
  sourceUrl?: string;
}

export interface EvidenceExtractor {
  extractFromUrl(url: string): Promise<ExtractedEvidence[]>;
  extractFromPdf(buffer: Buffer): Promise<ExtractedEvidence[]>;
  extractEntities(text: string): string[];
}
