import { NextResponse } from 'next/server';
import { listOsintInvestigations } from '@/lib/osint/investigations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const investigations = await listOsintInvestigations();
    return NextResponse.json({ investigations });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Não foi possível listar investigações OSINT.',
    }, { status: 503 });
  }
}
