import { NextResponse } from 'next/server';
import { getMaxNameCandidatesPerCase } from '@/lib/config';
import { detectInputType } from '@/lib/compliance';
import { resolveNameWithFreeSources } from '@/lib/name-resolution-free-sources';
import type { NameResolutionCandidate, NameResolutionResult, TargetType } from '@/lib/types';

export const dynamic = 'force-dynamic';

type NameResolutionDiagnosticStatus = 'WIKIDATA_DISABLED' | 'NOT_FOUND' | 'CANDIDATES_FOUND' | 'AMBIGUOUS' | 'SOURCE_ERROR' | 'INVALID_INPUT';

const ALLOWED_TARGET_TYPES = new Set<TargetType>(['PERSON', 'COMPANY', 'UNKNOWN']);

function normalizeTargetType(value: string | null): TargetType {
  const normalized = value?.trim().toUpperCase();
  return normalized && ALLOWED_TARGET_TYPES.has(normalized as TargetType) ? normalized as TargetType : 'UNKNOWN';
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.floor(parsed), getMaxNameCandidatesPerCase());
}

function stripSensitiveCandidateFields(candidate: NameResolutionCandidate): NameResolutionCandidate {
  const publicCandidate = { ...candidate };
  delete publicCandidate.documentNormalized;
  return publicCandidate;
}

function stripSensitiveResultFields(result: NameResolutionResult): NameResolutionResult {
  return {
    ...result,
    candidates: result.candidates.map(stripSensitiveCandidateFields),
  };
}

function toDiagnosticStatus(result: NameResolutionResult): NameResolutionDiagnosticStatus {
  const notes = result.notes.join(' ');
  if (notes.includes('WIKIDATA_ENABLED=false')) return 'WIKIDATA_DISABLED';
  if (notes.includes('Falha controlada') || notes.includes('Timeout ao consultar Wikidata')) return 'SOURCE_ERROR';
  if (result.status === 'AMBIGUOUS') return 'AMBIGUOUS';
  if (result.candidates.some((candidate) => candidate.status !== 'REJECTED')) return 'CANDIDATES_FOUND';
  return 'NOT_FOUND';
}

function logDiagnostic(targetType: TargetType, nameLength: number, candidateCount: number, diagnosticStatus: NameResolutionDiagnosticStatus): void {
  console.info('Name resolution debug requested', {
    targetType,
    nameLength,
    candidateCount,
    diagnosticStatus,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim() ?? '';
    const targetType = normalizeTargetType(searchParams.get('targetType'));
    const limit = parseLimit(searchParams.get('limit'));

    if (!name) {
      logDiagnostic(targetType, 0, 0, 'INVALID_INPUT');
      return NextResponse.json({
        diagnosticStatus: 'INVALID_INPUT' satisfies NameResolutionDiagnosticStatus,
        error: 'Informe o parâmetro name para testar a resolução por nome.',
      }, { status: 400 });
    }

    const inputType = detectInputType(name);
    if (inputType === 'CPF' || inputType === 'CNPJ') {
      logDiagnostic(targetType, name.length, 0, 'INVALID_INPUT');
      return NextResponse.json({
        diagnosticStatus: 'INVALID_INPUT' satisfies NameResolutionDiagnosticStatus,
        error: 'Este endpoint é apenas para resolução por nome. Use endpoints específicos para CPF/CNPJ.',
      }, { status: 400 });
    }

    const result = stripSensitiveResultFields(await resolveNameWithFreeSources({
      inputName: name,
      targetType,
      limit,
    }));
    const diagnosticStatus = toDiagnosticStatus(result);

    logDiagnostic(targetType, name.length, result.candidates.length, diagnosticStatus);

    return NextResponse.json({
      diagnosticStatus,
      ...result,
    });
  } catch {
    const diagnosticStatus: NameResolutionDiagnosticStatus = 'SOURCE_ERROR';
    console.info('Name resolution debug requested', {
      targetType: 'UNKNOWN',
      nameLength: 0,
      candidateCount: 0,
      diagnosticStatus,
    });
    return NextResponse.json({
      diagnosticStatus,
      error: 'Falha controlada ao testar resolução por nome. Nenhuma evidência foi criada.',
    }, { status: 502 });
  }
}
