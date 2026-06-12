import { z } from 'zod';

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const maskedCpf = /^\*{3}\.\*{3}\.\*{3}-\d{2}$|^\*{3}\.\*{3}\.\*{3}-\*{2}$/;
const maskedCnpj = /^\*{2}\.\*{3}\.\*{3}\/\d{4}-\*{2}$|^\*{2}\.\*{3}\.\*{3}\/\*{4}-\*{2}$/;
const cpfOrMasked = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\*{3}\.\*{3}\.\*{3}-(\d{2}|\*{2}))$/;
const cnpjOrMasked = /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\*{2}\.\*{3}\.\*{3}\/(\d{4}|\*{4})-\*{2})$/;

export const createCaseSchema = z.object({
  targetName: z.string().trim().min(2, 'Informe o nome do alvo ou a razão social.'),
  targetType: z.enum(['PERSON', 'COMPANY', 'GROUP', 'UNKNOWN']),
  identifier: optionalText,
  identifierMasked: optionalText,
  decisionType: z.enum(['SOCIETY', 'M_AND_A', 'CREDIT', 'LITIGATION', 'HIRING', 'PARTNERSHIP', 'INVESTMENT', 'OTHER'], {
    error: 'Selecione o objetivo da análise.',
  }),
  legitimatePurpose: z.string().trim().min(10, 'Explique a finalidade legítima com pelo menos 10 caracteres, por exemplo: avaliação de counterparty em M&A.'),
  context: optionalText,
  sector: optionalText,
  relatedTerms: optionalText,
}).superRefine((data, ctx) => {
  const identifier = data.identifier ?? data.identifierMasked;

  if (data.targetType === 'PERSON') {
    if (!/[A-Za-zÀ-ú]/.test(data.targetName) || /^\d+$/.test(data.targetName.replace(/\D/g, ''))) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetName'],
        message: 'Para Pessoa Física, informe o nome da pessoa. CPF é opcional e deve ficar no campo CPF.',
      });
    }

    if (identifier && !cpfOrMasked.test(identifier) && !maskedCpf.test(identifier)) {
      ctx.addIssue({
        code: 'custom',
        path: ['identifier'],
        message: 'CPF opcional inválido. Use CPF completo para mascaramento automático ou formato mascarado como ***.***.***-08.',
      });
    }
  }

  if (data.targetType === 'COMPANY') {
    const hasCompanyName = /[A-Za-zÀ-ú]/.test(data.targetName);
    const targetNameIsCnpj = cnpjOrMasked.test(data.targetName) || maskedCnpj.test(data.targetName);
    const identifierIsCnpj = Boolean(identifier && (cnpjOrMasked.test(identifier) || maskedCnpj.test(identifier)));
    const hasCnpj = targetNameIsCnpj || identifierIsCnpj;

    if (!hasCompanyName && !hasCnpj) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetName'],
        message: 'Para Pessoa Jurídica, informe a razão social no nome do alvo ou um CNPJ no campo CNPJ.',
      });
    }

    if (identifier && !identifierIsCnpj) {
      ctx.addIssue({
        code: 'custom',
        path: ['identifier'],
        message: 'CNPJ opcional inválido. Use CNPJ completo ou formato mascarado como **.***.***/0001-**.',
      });
    }
  }
});

export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.join('.') || 'formulário';
      return `${field}: ${issue.message}`;
    })
    .join('\n');
}

export type CreateCaseSchema = z.infer<typeof createCaseSchema>;
