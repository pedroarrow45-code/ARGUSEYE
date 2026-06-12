import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createCaseSchema } from '@/lib/validation';
import { detectInputType, maskCpf, formatCnpj } from '@/lib/compliance';
import { isDemoMode } from '@/lib/config';
import { getDemoCaseDetail } from '@/fixtures/demo-case';
import type { CaseData, CaseDetail } from '@/lib/types';

const inMemoryCases: CaseDetail[] = [];

export async function GET() {
  if (isDemoMode()) {
    const demo = getDemoCaseDetail();
    return NextResponse.json([demo, ...inMemoryCases]);
  }
  return NextResponse.json(inMemoryCases);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCaseSchema.parse(body);

    let identifierMasked: string | undefined;
    if (parsed.identifier) {
      const inputType = detectInputType(parsed.identifier);
      if (inputType === 'CPF') {
        identifierMasked = maskCpf(parsed.identifier);
      } else if (inputType === 'CNPJ') {
        identifierMasked = formatCnpj(parsed.identifier);
      } else {
        identifierMasked = parsed.identifier;
      }
    }

    const id = uuidv4();
    const now = new Date();

    const newCase: CaseData = {
      id,
      caseName: `DUE-${now.getFullYear()}-${String(inMemoryCases.length + 1).padStart(4, '0')}`,
      targetName: parsed.targetName,
      targetType: parsed.targetType,
      identifierMasked: identifierMasked || null,
      decisionType: parsed.decisionType,
      legitimatePurpose: parsed.legitimatePurpose,
      context: parsed.context || null,
      status: 'PENDING',
      overallRisk: null,
      recommendation: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isDemoMode()) {
      const demo = getDemoCaseDetail();
      const caseDetail: CaseDetail = {
        ...newCase,
        status: 'COMPLETED',
        overallRisk: demo.overallRisk,
        recommendation: demo.recommendation,
        targets: demo.targets.map(t => ({ ...t, id: uuidv4(), caseId: id, name: parsed.targetName, documentMasked: identifierMasked || t.documentMasked })),
        evidences: demo.evidences.map(e => ({ ...e, id: `EV-${String(Math.floor(Math.random() * 9000) + 1000)}`, caseId: id })),
        entities: demo.entities.map(e => ({ ...e, id: uuidv4(), caseId: id })),
        relationships: [],
        risks: demo.risks.map(r => ({ ...r, id: uuidv4(), caseId: id })),
        collectionJobs: [{ ...demo.collectionJobs[0], id: uuidv4(), caseId: id }],
      };

      const entityMap = new Map(demo.entities.map((e, i) => [e.id, caseDetail.entities[i].id]));
      caseDetail.relationships = demo.relationships.map(r => ({
        ...r,
        id: uuidv4(),
        caseId: id,
        sourceEntityId: entityMap.get(r.sourceEntityId) || r.sourceEntityId,
        targetEntityId: entityMap.get(r.targetEntityId) || r.targetEntityId,
      }));

      inMemoryCases.push(caseDetail);
      return NextResponse.json({ id }, { status: 201 });
    }

    const caseDetail: CaseDetail = {
      ...newCase,
      targets: [{
        id: uuidv4(),
        caseId: id,
        name: parsed.targetName,
        type: parsed.targetType,
        documentMasked: identifierMasked || null,
        sector: parsed.sector || null,
        notes: null,
        createdAt: now,
      }],
      evidences: [],
      entities: [],
      relationships: [],
      risks: [],
      collectionJobs: [{
        id: uuidv4(),
        caseId: id,
        status: 'PENDING',
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        mode: 'DEMO',
        createdAt: now,
        updatedAt: now,
      }],
    };

    inMemoryCases.push(caseDetail);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && 'issues' in err) {
      return NextResponse.json({ error: 'Dados inválidos', details: err }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
