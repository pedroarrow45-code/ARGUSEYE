'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveLocalCase } from '@/lib/local-cases';
import type { CaseDetail, DecisionType, MatchSignal, TargetType } from '@/lib/types';

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

type FormTargetType = Extract<TargetType, 'PERSON' | 'COMPANY' | 'UNKNOWN'>;
type FlowState = 'idle' | 'resolving' | 'candidates_found' | 'ambiguous' | 'not_found' | 'source_error' | 'creating_case' | 'case_created' | 'create_error';

type ResolvedCandidate = {
  candidateId: string;
  displayName: string;
  normalizedName: string;
  targetType: TargetType;
  sourceName: string;
  sourceUrl: string | null;
  matchScore: number;
  matchSignals: MatchSignal[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  collectedAt: string;
  documentMasked?: string;
};

type ResolveTargetResponse = {
  resolutionId?: string;
  inputName?: string;
  normalizedInputName?: string;
  targetType?: TargetType;
  status?: string;
  candidates?: ResolvedCandidate[];
  notes?: string[];
  generatedAt?: string;
  error?: string;
};

type CreateCaseFromCandidateResponse = {
  id?: string;
  case?: CaseDetail;
  error?: string;
};

type ResolutionRequest = {
  name: string;
  targetType: FormTargetType;
  decisionType: DecisionType;
  legitimatePurpose: string;
  context?: string;
  limit: number;
};

const FLOW_MESSAGES: Record<FlowState, string> = {
  idle: 'Informe um nome para descobrir candidatos em fontes públicas gratuitas.',
  resolving: 'Resolvendo alvo em fontes públicas gratuitas',
  candidates_found: 'Candidatos encontrados. Escolha explicitamente um candidato para criar um case básico.',
  ambiguous: 'Resultado ambíguo. Revise os candidatos antes de criar um case básico.',
  not_found: 'Nenhum candidato encontrado nas fontes gratuitas habilitadas.',
  source_error: 'Erro de fonte gratuita. Tente novamente ou ajuste os dados de busca.',
  creating_case: 'Criando case básico a partir do candidato selecionado…',
  case_created: 'Case criado. Redirecionando para o detalhe…',
  create_error: 'Erro ao criar case a partir do candidato selecionado.',
};

function mapStatusToFlow(status: string | undefined, candidateCount: number): FlowState {
  if (status === 'AMBIGUOUS') return 'ambiguous';
  if (status === 'SOURCE_ERROR') return 'source_error';
  if (status === 'SOURCE_DISABLED' || status === 'NOT_FOUND' || status === 'UNSUPPORTED') return 'not_found';
  if (candidateCount > 0 || status === 'CANDIDATES_FOUND') return 'candidates_found';
  return 'not_found';
}

function buildResolutionRequest(form: HTMLFormElement, targetType: FormTargetType): ResolutionRequest {
  const formData = new FormData(form);
  return {
    name: String(formData.get('targetName') ?? '').trim(),
    targetType,
    decisionType: String(formData.get('decisionType') ?? 'SOCIETY') as DecisionType,
    legitimatePurpose: String(formData.get('legitimatePurpose') ?? '').trim(),
    context: String(formData.get('context') ?? '').trim() || undefined,
    limit: 5,
  };
}

function validateResolutionRequest(input: ResolutionRequest): string | null {
  if (input.name.length < 2) return 'Informe o nome do alvo ou a razão social.';
  if (input.legitimatePurpose.length < 10) return 'Explique a finalidade legítima com pelo menos 10 caracteres.';
  return null;
}

export default function NewCaseForm() {
  const router = useRouter();
  const [targetType, setTargetType] = useState<FormTargetType>('PERSON');
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [loading, setLoading] = useState(false);
  const [creatingCandidateId, setCreatingCandidateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<ResolveTargetResponse | null>(null);
  const [lastRequest, setLastRequest] = useState<ResolutionRequest | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResolution(null);
    setCreatingCandidateId(null);
    setFlowState('resolving');

    const input = buildResolutionRequest(e.currentTarget, targetType);
    const validationError = validateResolutionRequest(input);

    if (validationError) {
      setError(validationError);
      setFlowState('idle');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/resolve-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json() as ResolveTargetResponse;

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao resolver alvo por nome.');
      }

      const candidates = data.candidates ?? [];
      setLastRequest(input);
      setResolution({ ...data, candidates });
      setFlowState(mapStatusToFlow(data.status, candidates.length));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao resolver alvo.');
      setFlowState('source_error');
    } finally {
      setLoading(false);
    }
  }

  async function createCaseFromCandidate(candidate: ResolvedCandidate) {
    if (!lastRequest) return;

    setError(null);
    setCreatingCandidateId(candidate.candidateId);
    setFlowState('creating_case');

    try {
      const res = await fetch('/api/cases/from-resolved-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lastRequest.name,
          targetType: lastRequest.targetType,
          selectedCandidateId: candidate.candidateId,
          explicitUserConfirmation: true,
          decisionType: lastRequest.decisionType,
          legitimatePurpose: lastRequest.legitimatePurpose,
          context: lastRequest.context,
          limit: lastRequest.limit,
        }),
      });
      const data = await res.json() as CreateCaseFromCandidateResponse;

      if (!res.ok || !data.case) {
        const fallback = candidate.targetType === 'PERSON'
          ? 'Busca real por Pessoa Física baseada apenas em nome ainda não está disponível para criação de case nesta versão.'
          : 'Erro ao criar case básico a partir do candidato selecionado.';
        throw new Error(data.error || fallback);
      }

      saveLocalCase(data.case);
      setFlowState('case_created');
      router.push(`/cases/${data.id ?? data.case.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao criar case.');
      setFlowState('create_error');
    } finally {
      setCreatingCandidateId(null);
    }
  }

  const candidates = resolution?.candidates ?? [];
  const hasCandidates = candidates.length > 0;

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
            <button
              type="button"
              onClick={() => setTargetType('UNKNOWN')}
              className={`flex-1 py-[10px] rounded-[var(--r-xs)] text-[13px] font-semibold transition-all ${
                targetType === 'UNKNOWN'
                  ? 'bg-gradient-to-b from-[var(--blue)] to-[#2E5BC4] text-white shadow-[0_4px_12px_-4px_rgba(59,111,224,.5)]'
                  : 'text-[var(--txt-2)]'
              }`}
            >
              Auto/Desconhecido
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Name */}
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="targetName" className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Nome do alvo
            </label>
            <input
              id="targetName"
              name="targetName"
              required
              placeholder={targetType === 'PERSON' ? 'Ex.: João A. Monteiro' : 'Ex.: Monteiro Capital Participações Ltda.'}
            />
          </div>

          {/* Resolution Scope */}
          <div className="flex flex-col gap-[7px]">
            <label className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Fonte de descoberta
            </label>
            <div className="p-3 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--ink)] text-[12px] text-[var(--txt-2)] leading-relaxed">
              Busca name-first em fontes públicas gratuitas. Wikidata é usada apenas para descoberta de candidato, não como evidência cadastral confirmada.
            </div>
          </div>

          {/* Decision Type */}
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="decisionType" className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Objetivo da análise
            </label>
            <select id="decisionType" name="decisionType" defaultValue="SOCIETY">
              {DECISION_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          {/* Legitimate Purpose */}
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="legitimatePurpose" className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Finalidade legítima da análise
            </label>
            <input
              id="legitimatePurpose"
              name="legitimatePurpose"
              required
              placeholder="Ex.: avaliação de counterparty em M&A"
            />
          </div>

          {/* Context */}
          <div className="flex flex-col gap-[7px] md:col-span-2">
            <label htmlFor="context" className="text-[11px] font-mono tracking-[.08em] uppercase text-[var(--txt-3)] font-semibold">
              Contexto da decisão <span className="text-[var(--txt-faint)] normal-case tracking-normal text-[10px]">(opcional)</span>
            </label>
            <textarea id="context" name="context" placeholder="Hipótese inicial, stakeholders, prazo de decisão, sensibilidade…" />
          </div>
        </div>

        <div className="mt-4 p-3 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--ink)] text-[12px] text-[var(--txt-2)]">
          {FLOW_MESSAGES[flowState]}
          {targetType === 'PERSON' && (
            <div className="mt-2 text-[var(--amber)]">
              Pessoa Física não será confirmada apenas por nome. Qualquer case criado será básico e não confirmado.
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[rgba(224,83,59,.1)] border border-[rgba(224,83,59,.3)] rounded-[var(--r-sm)] text-sm text-[var(--red-soft)]">
            {error.split('\n').map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-[22px] items-center flex-wrap">
          <button type="submit" className="btn btn-primary" disabled={loading || flowState === 'creating_case'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
            {loading ? 'Resolvendo alvo em fontes públicas gratuitas' : 'Buscar candidatos'}
          </button>
          <span className="text-[11px] text-[var(--txt-3)] font-mono">
            Fontes gratuitas · seleção manual · sem evidência automática
          </span>
        </div>
      </div>

      {(resolution || flowState === 'not_found' || flowState === 'source_error') && (
        <div className="panel p-[18px] mt-4">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-bold">Candidatos encontrados</h2>
              <p className="text-[12px] text-[var(--txt-2)] mt-1">
                Escolha manualmente um candidato. A seleção cria apenas um case básico sem evidências confirmadas.
              </p>
            </div>
            {resolution?.status && <span className="pill pill-scan">{resolution.status}</span>}
          </div>

          {!hasCandidates ? (
            <div className="p-4 rounded-[var(--r-sm)] border border-[var(--line)] text-[13px] text-[var(--txt-2)]">
              {flowState === 'source_error' ? 'Não foi possível consultar a fonte gratuita agora.' : 'Nenhum candidato disponível para seleção.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {candidates.map((candidate) => {
                const ambiguous = candidate.status === 'AMBIGUOUS' || flowState === 'ambiguous';
                const isCreating = creatingCandidateId === candidate.candidateId;
                return (
                  <div key={candidate.candidateId} className="p-4 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--ink)]">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-[15px] font-bold">{candidate.displayName}</div>
                        <div className="text-[11px] text-[var(--txt-3)] font-mono mt-1">
                          {candidate.targetType} · {candidate.sourceName} · score {candidate.matchScore} · confiança {candidate.confidence} · status {candidate.status}
                        </div>
                      </div>
                      {candidate.sourceUrl && (
                        <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="pill pill-ok hover:underline">
                          Abrir fonte
                        </a>
                      )}
                    </div>

                    {ambiguous && (
                      <div className="mt-3 text-[12px] text-[var(--amber)]">
                        Resultado ambíguo: revise homônimos e fonte antes de criar um case básico.
                      </div>
                    )}

                    {candidate.targetType === 'PERSON' && (
                      <div className="mt-3 text-[12px] text-[var(--amber)]">
                        Pessoa Física não confirmada por nome. O case básico não representa identificação final.
                      </div>
                    )}

                    <div className="mt-3 text-[12px] text-[var(--txt-2)]">
                      Candidato não será convertido em evidência. Wikidata permanece fonte de descoberta.
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost mt-4"
                      disabled={flowState === 'creating_case'}
                      onClick={() => createCaseFromCandidate(candidate)}
                    >
                      {isCreating ? 'Criando case…' : 'Criar case básico com este candidato'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
