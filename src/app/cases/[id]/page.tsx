import { getDemoCaseDetail } from '@/fixtures/demo-case';
import CaseDetailClient from './CaseDetailClient';
import CaseDetailLoader from './CaseDetailLoader';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;

  if (id === 'demo-case-001') {
    return <CaseDetailClient caseDetail={getDemoCaseDetail()} />;
  }

  return <CaseDetailLoader id={id} />;
}
