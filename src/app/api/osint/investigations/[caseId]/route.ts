import { NextResponse } from 'next/server';
import { getOsintInvestigationDetail } from '@/lib/osint/investigations';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ caseId: string }>;
}

export async function GET(_request: Request, context: Context) {
  const { caseId } = await context.params;

  try {
    const investigation = await getOsintInvestigationDetail(caseId);
    if (!investigation) {
      return NextResponse.json({ error: 'Investigação OSINT não encontrada.' }, { status: 404 });
    }
    return NextResponse.json(investigation);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Não foi possível abrir a investigação OSINT.',
    }, { status: 503 });
  }
}
