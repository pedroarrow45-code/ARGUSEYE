interface Props {
  markdown: string;
}

export default function MarkdownReportView({ markdown }: Props) {
  return (
    <pre className="panel p-[18px] whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--txt-2)] overflow-x-auto font-mono">
      {markdown || 'Relatório não disponível.'}
    </pre>
  );
}
