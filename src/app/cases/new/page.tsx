import ComplianceBanner from '@/components/dashboard/ComplianceBanner';
import NewCaseForm from '@/components/cases/NewCaseForm';

export default function NewCasePage() {
  return (
    <>
      <div className="flex items-end justify-between gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.24em] text-[var(--blue-soft)] uppercase mb-2 flex items-center gap-2">
            <span className="w-[18px] h-px bg-[var(--blue)]" />
            Intake · Abertura de caso
          </div>
          <h1 className="text-[25px] font-bold tracking-tight leading-tight">Busca & Due Diligence</h1>
          <p className="text-[var(--txt-2)] text-[13px] mt-[7px] max-w-[560px] leading-relaxed">
            Defina o alvo e o contexto da decisão. O Gazua OSINT estrutura a varredura de fontes públicas a partir destes parâmetros.
          </p>
        </div>
      </div>

      <ComplianceBanner />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-[18px] items-start">
        <NewCaseForm />

        <div className="flex flex-col gap-4">
          <div className="panel p-[18px]">
            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Três camadas de inteligência
            </h3>
            {[
              ['Coleta pública', 'Fontes abertas, oficiais e verificáveis'],
              ['Normalização & análise', 'Alvos, entidades, vínculos, red flags'],
              ['Inteligência & relatório', 'Timeline, matriz de risco, dossiê'],
            ].map(([title, desc], i) => (
              <div key={i} className={`flex gap-3 py-[10px] ${i < 2 ? 'border-b border-[var(--line-soft)]' : ''}`}>
                <div className="font-mono text-[var(--blue-soft)] text-[13px] font-semibold">{i + 1}</div>
                <div>
                  <div className="text-[13px] font-semibold">{title}</div>
                  <div className="text-[11.5px] text-[var(--txt-3)] mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-[11px] bg-gradient-to-br from-[rgba(47,182,201,.06)] to-transparent border border-[var(--line-soft)] rounded-[var(--r-sm)] p-3 text-[11.5px] text-[var(--txt-2)] leading-relaxed">
            <svg className="w-[17px] h-[17px] flex-none stroke-[var(--cyan)] mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.7">
              <path d="M12 3 4 6v6c0 4.5 3.5 7.5 8 9 4.5-1.5 8-4.5 8-9V6z"/>
            </svg>
            <div>
              ARGUS EYE combina <strong className="text-[var(--txt)] font-semibold">automação OSINT, leitura documental, estruturação de evidências e revisão analítica humana</strong>.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
