'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateCaseInput } from '@/lib/types';

const DECISION_TYPES = [
  { value: 'SOCIETY', label: 'Entrada de sócio' },
  { value: 'M_AND_A', label: 'M&A' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'LITIGATION', label: 'Litígio' },
  { value: 'HIRING', label: 'Contratação executiva' },
  { value: 'PARTNERSHIP', label: 'Parceria' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'OTHER', label: 'Outro' },
] as const;

export default function NewCaseForm() {
  const router = useRouter();
  const [targetType, setTargetType] = useState<'PERSON' | 'COMPANY'>('PERSON');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const input: CreateCaseInput = {
      targetName: formData.get('targetName') as string,
      targetType,
      identifier: formData.get('identifier') as string || undefined,
      decisionType: formData.get('decisionType') as CreateCaseInput['decisionType'],
      legitimatePurpose: formData.get('legitimatePurpose') as string,
      context: formData.get('context') as string || undefined,
      sector: formData.get('sector') as string || undefined,
      relatedTerms: formData.get('relatedTerms') as string || undefined,
    };

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar case');
      }

      const data = await res.json();
      router.push(`/cases/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="panel p-[18px]">
        {/* Target Type Toggle */}
        <div className="mb-[18px]">
          <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold block mb-[7px]">
            Tipo de alvo
          </label>
          <div className="flex gap-2 bg-[var(--ink)] p-[5px] rounded-[var(--r-sm)] border border-[var(--line)]">
            <button
              type="button"
              onClick={() => setTargetType('PERSON')}
              className={`flex-1 py-[10px] rounded-[var(--r-xs)] text-[13px] font-semibold transition-all ${
                targetType === 'PERSON'
                  ? 'bg-gradient-to-b from-[var(--blue)] to-[#2E5BC4] text-white shadow-[0_4px_12px_-4px_rgba(59,111,224,.5)]'
                  : 'text-[var(--txt-2)]'
              }`}
            >
              Pessoa Física (PF)
            </button>
            <button
              type="button"
              onClick={() => setTargetType('COMPANY')}
              className={`flex-1 py-[10px] rounded-[var(--r-xs)] text-[13px] font-semibold transition-all ${
                targetType === 'COMPANY'
                  ? 'bg-gradient-to-b from-[var(--blue)] to-[#2E5BC4] text-white shadow-[0_4px_12px_-4px_rgba(59,111,224,.5)]'
                  : 'text-[var(--txt-2)]'
              }`}
            >
              Pessoa Jurídica (PJ)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Name */}
          <div className="flex flex-col gap-[7px]">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Nome do alvo
            </label>
            <input
              name="targetName"
              required
              placeholder={targetType === 'PERSON' ? 'Ex.: João A. Monteiro' : 'Ex.: Monteiro Capital Participações Ltda.'}
            />
          </div>

          {/* Identifier */}
          <div className="flex flex-col gap-[7px]">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              {targetType === 'PERSON' ? 'CPF' : 'CNPJ'}{' '}
              <span className="text-[var(--txt-faint)] normal-case tracking-normal text-[10px]">(opcional · mascarado)</span>
            </label>
            <input
              name="identifier"
              placeholder={targetType === 'PERSON' ? '***.***.***-08' : '**.***.***/0001-**'}
            />
            {targetType === 'PERSON' && (
              <span className="text-[10.5px] text-[var(--txt-faint)]">
                CPF nunca é exibido integralmente. Use apenas como identificador técnico mascarado.
              </span>
            )}
          </div>

          {/* Sector */}
          <div className="flex flex-col gap-[7px]">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Setor
            </label>
            <input name="sector" placeholder="Ex.: Participações e investimentos" />
          </div>

          {/* Decision Type */}
          <div className="flex flex-col gap-[7px]">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Objetivo da análise
            </label>
            <select name="decisionType" defaultValue="SOCIETY">
              {DECISION_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          {/* Legitimate Purpose */}
          <div className="flex flex-col gap-[7px] md:col-span-2">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Finalidade legítima da análise
            </label>
            <input
              name="legitimatePurpose"
              required
              placeholder="Ex.: avaliação de counterparty em M&A"
            />
          </div>

          {/* Related Terms */}
          <div className="flex flex-col gap-[7px] md:col-span-2">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Termos relacionados
            </label>
            <input name="relatedTerms" placeholder="Apelidos, razões sociais, marcas, intermediários…" />
          </div>

          {/* Context */}
          <div className="flex flex-col gap-[7px] md:col-span-2">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Contexto da decisão <span className="text-[var(--txt-faint)] normal-case tracking-normal text-[10px]">(opcional)</span>
            </label>
            <textarea name="context" placeholder="Hipótese inicial, stakeholders, prazo de decisão, sensibilidade…" />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[rgba(224,83,59,.1)] border border-[rgba(224,83,59,.3)] rounded-[var(--r-sm)] text-sm text-[var(--red-soft)]">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-[22px] items-center flex-wrap">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
            {loading ? 'Processando…' : 'Iniciar Due Diligence'}
          </button>
          <span className="text-[11px] text-[var(--txt-3)] font-mono">
            Gazua OSINT · modo demonstrativo
          </span>
        </div>
      </div>
    </form>
  );
}
