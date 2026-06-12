import { describe, it, expect } from 'vitest';
import { analyzeCase, buildGraphData, classifyRisk } from '@/lib/analyzer/argusAnalyzer';
import { getDemoCaseDetail } from '@/fixtures/demo-case';

describe('Analyzer', () => {
  const demo = getDemoCaseDetail();

  it('produces analysis result with all required fields', () => {
    const result = analyzeCase(demo, demo.targets, demo.evidences, demo.entities, demo.relationships, demo.risks);

    expect(result.summary).toBeTruthy();
    expect(result.metrics).toBeDefined();
    expect(result.risks).toBeInstanceOf(Array);
    expect(result.recommendation).toBeTruthy();
    expect(result.confidenceNotes).toBeInstanceOf(Array);
    expect(result.unresolvedGaps).toBeInstanceOf(Array);
    expect(result.graphData).toBeDefined();
  });

  it('computes metrics from evidences', () => {
    const result = analyzeCase(demo, demo.targets, demo.evidences, demo.entities, demo.relationships, demo.risks);

    expect(result.metrics.publicEvidences).toBe(demo.evidences.length);
    expect(result.metrics.connectionsFound).toBe(demo.relationships.length);
    expect(result.metrics.lawsuitsFound).toBeGreaterThan(0);
  });

  it('generates graph data from entities and relationships', () => {
    const graph = buildGraphData(demo.entities, demo.relationships);

    expect(graph.nodes.length).toBe(demo.entities.length);
    expect(graph.edges.length).toBe(demo.relationships.length);
    expect(graph.nodes[0]).toHaveProperty('id');
    expect(graph.nodes[0]).toHaveProperty('label');
    expect(graph.nodes[0]).toHaveProperty('type');
    expect(graph.edges[0]).toHaveProperty('source');
    expect(graph.edges[0]).toHaveProperty('target');
    expect(graph.edges[0]).toHaveProperty('label');
  });

  it('determines recommendation based on risks', () => {
    const result = analyzeCase(demo, demo.targets, demo.evidences, demo.entities, demo.relationships, demo.risks);
    const validRecs = ['PROCEED', 'PROCEED_WITH_CAUTION', 'INVESTIGATE_FURTHER', 'SUSPEND_DECISION', 'NOT_RECOMMENDED'];
    expect(validRecs).toContain(result.recommendation);
  });

  it('classifies risk levels', () => {
    expect(classifyRisk('CRITICAL')).toEqual({ label: 'Crítico', color: '#FF3B30' });
    expect(classifyRisk('HIGH')).toEqual({ label: 'Alto', color: '#E0533B' });
    expect(classifyRisk('MEDIUM')).toEqual({ label: 'Médio', color: '#E8A23D' });
    expect(classifyRisk('LOW')).toEqual({ label: 'Baixo', color: '#3FB57A' });
  });

  it('identifies gaps in analysis', () => {
    const result = analyzeCase(demo, demo.targets, demo.evidences, demo.entities, demo.relationships, demo.risks);
    expect(result.unresolvedGaps).toBeInstanceOf(Array);
  });
});
