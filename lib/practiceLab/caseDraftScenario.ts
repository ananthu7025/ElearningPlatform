import { z } from 'zod'

/** Structured body stored in PracticeScenario.content for CASE_DRAFTING */
export const caseDraftContentSchema = z.object({
  facts: z.array(z.string().min(1)).min(1, 'Add at least one fact'),
  issues: z.array(z.string().min(1)).min(1, 'Add at least one legal issue'),
  applicableLaw: z.array(z.string().min(1)).min(1, 'Add at least one applicable law or provision'),
  instructions: z.string().min(10, 'Instructions are required'),
  brief: z.string().optional(),
})

export type CaseDraftContent = z.infer<typeof caseDraftContentSchema>

export const caseDraftCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  caseType: z.string().max(200).optional().nullable(),
  caseId: z.string().max(120).optional().nullable(),
  content: caseDraftContentSchema,
  isPublished: z.boolean().optional().default(false),
})

export const caseDraftUpdateSchema = caseDraftCreateSchema.partial().extend({
  isPublished: z.boolean().optional(),
})
