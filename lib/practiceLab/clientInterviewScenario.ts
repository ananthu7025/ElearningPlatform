import { z } from 'zod'

/** Structured body stored in PracticeScenario.content for CLIENT_INTERVIEW */
export const clientInterviewContentSchema = z.object({
  facts: z.array(z.string().min(1)).min(1, 'Add at least one fact'),
  provisions: z.array(z.string().min(1)).min(1, 'Add at least one legal point / provision'),
  brief: z.string().optional(),
})

export type ClientInterviewContent = z.infer<typeof clientInterviewContentSchema>

export const clientInterviewCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  clientName: z.string().max(200).optional().nullable(),
  caseType: z.string().max(200).optional().nullable(),
  caseId: z.string().max(120).optional().nullable(),
  content: clientInterviewContentSchema,
  isPublished: z.boolean().optional().default(false),
})

export const clientInterviewUpdateSchema = clientInterviewCreateSchema.partial().extend({
  isPublished: z.boolean().optional(),
})
