import { NextResponse } from 'next/server';
import { getRuntimeModeFlags } from '@/lib/config';
import { cleanCnpj, fetchCompanyByCnpj, isValidCnpjForLookup, maskCnpjForLog } from '@/lib/connectors/brasilApiCnpjConnector';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCnpj = searchParams.get('cnpj') ?? '';
  const cnpj = cleanCnpj(rawCnpj);
  const flags = getRuntimeModeFlags();

  console.info('Debug BrasilAPI requested', { ...flags, cnpj: maskCnpjForLog(cnpj) });

  if (!isValidCnpjForLookup(cnpj)) {
    return NextResponse.json({
      ok: false,
      cnpj,
      error: 'CNPJ inválido: informe exatamente 14 dígitos.',
    }, { status: 400 });
  }

  const result = await fetchCompanyByCnpj(cnpj);

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      cnpj,
      status: result.status ?? null,
      sourceUrl: result.sourceUrl ?? null,
      error: result.error,
    }, { status: result.status && result.status >= 400 ? result.status : 502 });
  }

  return NextResponse.json({
    ok: true,
    cnpj: result.company.cnpj,
    sourceUrl: result.company.sourceUrl,
    razaoSocial: result.company.razaoSocial,
    nomeFantasia: result.company.nomeFantasia,
    situacaoCadastral: result.company.situacaoCadastral,
    cnaePrincipal: result.company.cnaePrincipal,
    municipio: result.company.municipio,
    uf: result.company.uf,
    capitalSocial: result.company.capitalSocial,
    qsaCount: result.company.qsa.length,
  });
}
