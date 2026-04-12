import { z } from 'zod'

/** Structured body stored in PracticeScenario.content for CONTRACT_DRAFTING */
export const contractDraftContentSchema = z.object({
  contractType: z.string().min(2, 'Contract type is required'),
  partyA: z.string().min(2, 'Party A description is required'),
  partyB: z.string().min(2, 'Party B description is required'),
  background: z.string().min(10, 'Background/context is required'),
  requiredClauses: z.array(z.string().min(1)).min(1, 'Add at least one required clause'),
  instructions: z.string().min(10, 'Instructions are required'),
})

export type ContractDraftContent = z.infer<typeof contractDraftContentSchema>

export const contractDraftCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  caseType: z.string().max(200).optional().nullable(),
  caseId: z.string().max(120).optional().nullable(),
  content: contractDraftContentSchema,
  isPublished: z.boolean().optional().default(false),
})

export const contractDraftUpdateSchema = contractDraftCreateSchema.partial().extend({
  isPublished: z.boolean().optional(),
})
