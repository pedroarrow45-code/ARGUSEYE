import { z } from 'zod';

export const createCaseSchema = z.object({
  targetName: z.string().min(2, 'Nome do alvo é obrigatório'),
  targetType: z.enum(['PERSON', 'COMPANY', 'GROUP', 'UNKNOWN']),
  identifier: z.string().optional(),
  decisionType: z.enum(['SOCIETY', 'M_AND_A', 'CREDIT', 'LITIGATION', 'HIRING', 'PARTNERSHIP', 'INVESTMENT', 'OTHER']),
  legitimatePurpose: z.string().min(10, 'Finalidade legítima é obrigatória (mínimo 10 caracteres)'),
  context: z.string().optional(),
  sector: z.string().optional(),
  relatedTerms: z.string().optional(),
});

export type CreateCaseSchema = z.infer<typeof createCaseSchema>;
