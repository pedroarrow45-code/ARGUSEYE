import { NextResponse } from 'next/server';
import { getDemoCaseDetail } from '@/fixtures/demo-case';
import { collectFreeLiveEvidence } from '@/lib/collection/collectFreeLiveEvidence';
import { getRuntimeModeFlags, isDemoMode } from '@/lib/config';
import { createCaseSchema, formatValidationError } from '@/lib/validation';
import type { CaseDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
    const parsed = createCaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }

    const runtimeMode = getRuntimeModeFlags();
    console.info('Create case requested', {
      targetType: parsed.data.targetType,
      hasIdentifier: Boolean(parsed.data.identifier || parsed.data.identifierMasked),
      runtimeMode,
    });

    const caseDetail = await collectFreeLiveEvidence(parsed.data, {
      caseNumber: inMemoryCases.length + 1,
    });

    inMemoryCases.push(caseDetail);
    return NextResponse.json({ id: caseDetail.id, case: caseDetail, runtimeMode }, { status: 201 });
  } catch (error) {
    console.error('Create case failed', error instanceof Error ? { message: error.message, name: error.name } : { message: 'erro desconhecido' });
    return NextResponse.json({ error: 'Não foi possível criar o case. Verifique os dados enviados e tente novamente.' }, { status: 500 });
  }
}
