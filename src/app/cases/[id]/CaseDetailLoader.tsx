'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLocalCaseById } from '@/lib/local-cases';
import type { CaseDetail } from '@/lib/types';
import CaseDetailClient from './CaseDetailClient';

interface Props {
  id: string;
}

export default function CaseDetailLoader({ id }: Props) {
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      setCaseDetail(getLocalCaseById(id));
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (!loaded) {
    return (
      <div className="panel p-8 text-center text-[var(--txt-2)]">
        Carregando case local…
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="panel p-8 text-center">
        <div className="font-mono text-[11px] tracking-[.16em] text-[var(--txt-3)] uppercase mb-3">Case não encontrado</div>
        <h1 className="text-xl font-bold mb-2">Este case não está salvo neste navegador.</h1>
        <p className="text-[var(--txt-2)] text-sm mb-5">
          Cases do MVP são persistidos em localStorage. Crie uma nova due diligence ou abra a listagem local.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/cases/new" className="btn btn-primary">Criar nova due diligence</Link>
          <Link href="/cases" className="btn btn-ghost">Ver cases</Link>
          <Link href="/" className="btn btn-ghost">Dashboard</Link>
        </div>
      </div>
    );
  }

  return <CaseDetailClient caseDetail={caseDetail} />;
}
