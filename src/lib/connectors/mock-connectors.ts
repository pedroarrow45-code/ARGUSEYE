import type { SearchConnector, SearchResult, EvidenceExtractor, ExtractedEvidence } from './types';

export class CompanyRegistryConnector implements SearchConnector {
  name = 'CompanyRegistryConnector (Mock)';

  async search(query: string): Promise<SearchResult[]> {
    return [
      {
        title: `Registro comercial — ${query}`,
        url: 'https://mock.jucesp.sp.gov.br/consulta',
        snippet: `Razão social localizada no registro da Junta Comercial para o termo "${query}".`,
        source: 'Junta Comercial (Mock)',
        publishedAt: new Date('2023-08-18'),
      },
    ];
  }
}

export class WebSearchConnector implements SearchConnector {
  name = 'WebSearchConnector (Mock)';

  async search(query: string): Promise<SearchResult[]> {
    return [
      {
        title: `Resultados web para "${query}"`,
        url: 'https://mock.search.example.com',
        snippet: `Menções públicas localizadas para o termo "${query}" em fontes abertas.`,
        source: 'Web Search (Mock)',
      },
    ];
  }
}

export class NewsSearchConnector implements SearchConnector {
  name = 'NewsSearchConnector (Mock)';

  async search(query: string): Promise<SearchResult[]> {
    return [
      {
        title: `Notícia relevante sobre ${query}`,
        url: 'https://mock.news.example.com/article',
        snippet: `Cobertura jornalística identificada para o termo "${query}".`,
        source: 'Veículo Econômico (Mock)',
        publishedAt: new Date('2024-01-30'),
      },
    ];
  }
}

export class CourtMetadataConnector implements SearchConnector {
  name = 'CourtMetadataConnector (Mock)';

  async search(query: string): Promise<SearchResult[]> {
    return [
      {
        title: `Processo público — ${query}`,
        url: 'https://mock.tjsp.jus.br/consulta',
        snippet: `Metadado processual localizado para "${query}" em tribunais públicos.`,
        source: 'TJ-SP (Mock)',
      },
    ];
  }
}

export class OfficialGazetteConnector implements SearchConnector {
  name = 'OfficialGazetteConnector (Mock)';

  async search(query: string): Promise<SearchResult[]> {
    return [
      {
        title: `Publicação em Diário Oficial — ${query}`,
        url: 'https://mock.diariooficial.example.com',
        snippet: `Menção localizada em diário oficial para "${query}".`,
        source: 'D.O. Municipal (Mock)',
        publishedAt: new Date('2023-03-12'),
      },
    ];
  }
}

export class PdfExtractionConnector implements EvidenceExtractor {
  async extractFromUrl(_url: string): Promise<ExtractedEvidence[]> {
    return [
      {
        title: 'Documento público indexado (Mock)',
        excerpt: 'Trecho relevante extraído de documento público para fins de análise.',
        entities: ['Entidade Fictícia'],
        sourceUrl: _url,
      },
    ];
  }

  async extractFromPdf(_buffer: Buffer): Promise<ExtractedEvidence[]> {
    return [
      {
        title: 'PDF processado (Mock)',
        excerpt: 'Conteúdo extraído de PDF público para análise OSINT.',
        entities: ['Entidade Fictícia'],
      },
    ];
  }

  extractEntities(text: string): string[] {
    const entityPattern = /[A-Z][a-záàâãéèêíïóôõöúç]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúç]+)+/g;
    return [...new Set(text.match(entityPattern) || [])];
  }
}

export function getConnectors() {
  return {
    companyRegistry: new CompanyRegistryConnector(),
    webSearch: new WebSearchConnector(),
    newsSearch: new NewsSearchConnector(),
    courtMetadata: new CourtMetadataConnector(),
    officialGazette: new OfficialGazetteConnector(),
    pdfExtraction: new PdfExtractionConnector(),
  };
}
