import { describe, it, expect } from 'vitest';
import { getDemoCaseDetail, demoCase, demoTargets, demoEvidences, demoEntities, demoRelationships, demoRisks } from '@/fixtures/demo-case';
import { containsRawCpf } from '@/lib/compliance';

describe('Fixtures', () => {
  it('loads demo case correctly', () => {
    const detail = getDemoCaseDetail();
    expect(detail.id).toBeTruthy();
    expect(detail.caseName).toBeTruthy();
    expect(detail.targetName).toBeTruthy();
    expect(detail.targets.length).toBeGreaterThan(0);
    expect(detail.evidences.length).toBeGreaterThanOrEqual(8);
    expect(detail.entities.length).toBeGreaterThanOrEqual(8);
    expect(detail.relationships.length).toBeGreaterThanOrEqual(8);
    expect(detail.risks.length).toBeGreaterThanOrEqual(3);
  });

  it('demo case has required fields', () => {
    expect(demoCase.status).toBeTruthy();
    expect(demoCase.targetType).toBeTruthy();
    expect(demoCase.decisionType).toBeTruthy();
    expect(demoCase.legitimatePurpose).toBeTruthy();
  });

  it('demo targets have masked documents only', () => {
    demoTargets.forEach(t => {
      if (t.documentMasked) {
        expect(t.documentMasked).toContain('*');
      }
    });
  });

  it('demo evidences have source and confidence', () => {
    demoEvidences.forEach(e => {
      expect(e.sourceName).toBeTruthy();
      expect(e.sourceType).toBeTruthy();
      expect(e.confidence).toBeTruthy();
      expect(e.title).toBeTruthy();
    });
  });

  it('no raw CPF in demo data', () => {
    const allText = JSON.stringify(getDemoCaseDetail());
    expect(containsRawCpf(allText)).toBe(false);
  });

  it('demo entities have valid types', () => {
    const validTypes = ['PERSON', 'COMPANY', 'PUBLIC_BODY', 'LEGAL_CASE', 'CONTRACT', 'ADDRESS', 'DOCUMENT', 'WEBSITE', 'OTHER'];
    demoEntities.forEach(e => {
      expect(validTypes).toContain(e.type);
    });
  });

  it('demo relationships reference existing entities', () => {
    const entityIds = new Set(demoEntities.map(e => e.id));
    demoRelationships.forEach(r => {
      expect(entityIds.has(r.sourceEntityId)).toBe(true);
      expect(entityIds.has(r.targetEntityId)).toBe(true);
    });
  });

  it('demo risks have valid severity', () => {
    const validSeverity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    demoRisks.forEach(r => {
      expect(validSeverity).toContain(r.severity);
    });
  });
});
