import { getDemoCaseDetail } from '@/fixtures/demo-case';
import CaseDetailClient from './CaseDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;

  const caseDetail = getDemoCaseDetail();

  if (id !== caseDetail.id && id !== 'demo-case-001') {
    const newCase = { ...caseDetail, id, caseName: `CASE-${id.slice(0, 8).toUpperCase()}` };
    return <CaseDetailClient caseDetail={newCase} />;
  }

  return <CaseDetailClient caseDetail={caseDetail} />;
}
