import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listGET } from '@/app/api/osint/investigations/route';
import { GET as detailGET } from '@/app/api/osint/investigations/[caseId]/route';

vi.mock('@/lib/osint/investigations', () => ({
  listOsintInvestigations: vi.fn(),
  getOsintInvestigationDetail: vi.fn(),
}));

import { getOsintInvestigationDetail, listOsintInvestigations } from '@/lib/osint/investigations';

const listMock = vi.mocked(listOsintInvestigations);
const detailMock = vi.mocked(getOsintInvestigationDetail);

describe('GET /api/osint/investigations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro controlado sem DATABASE_URL', async () => {
    listMock.mockRejectedValue(new Error('DATABASE_URL não configurado.'));

    const response = await listGET();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(String(body.error)).toContain('DATABASE_URL');
  });

  it('lista investigações recentes', async () => {
    listMock.mockResolvedValue([{ caseId: 'case-1', target: '***.***.***-09', status: 'COMPLETED', createdAt: new Date('2026-06-13T10:00:00Z'), latestCollectionJob: null, sourceCount: 2, evidenceCount: 1 }]);

    const response = await listGET();
    const body = await response.json() as { investigations: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.investigations[0].target).toBe('***.***.***-09');
    expect(JSON.stringify(body)).not.toContain('123.456.789-09');
  });
});

describe('GET /api/osint/investigations/[caseId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 404 quando case não existe', async () => {
    detailMock.mockResolvedValue(null);

    const response = await detailGET(new Request('http://localhost/api/osint/investigations/case-404'), { params: Promise.resolve({ caseId: 'case-404' }) });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(String(body.error)).toContain('não encontrada');
  });

  it('retorna detalhe com relatório reconstruído', async () => {
    detailMock.mockResolvedValue({
      case: { id: 'case-1', caseName: 'OSINT-1', targetName: 'Argus Eye LTDA', status: 'COMPLETED', createdAt: new Date('2026-06-13T10:00:00Z'), updatedAt: new Date('2026-06-13T10:10:00Z') },
      collectionJobs: [{ id: 'job-1', status: 'COMPLETED', startedAt: null, completedAt: null, createdAt: new Date('2026-06-13T10:00:00Z') }],
      ledger: [],
      documents: [],
      evidenceCandidates: [],
      reportMarkdown: '# Relatório OSINT público',
      limitations: ['Leitura de histórico'],
    });

    const response = await detailGET(new Request('http://localhost/api/osint/investigations/case-1'), { params: Promise.resolve({ caseId: 'case-1' }) });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect((body.case as Record<string, unknown>).id).toBe('case-1');
    expect(body.reportMarkdown).toBe('# Relatório OSINT público');
  });
});
