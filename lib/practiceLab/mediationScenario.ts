import { z } from 'zod'

const partySchema = z.object({
  name:      z.string().min(2, 'Party name is required'),
  role:      z.string().min(2, 'Role is required (e.g. Claimant / Respondent)'),
  position:  z.string().min(5, 'Position statement is required'),
  interests: z.string().min(5, 'Underlying interests are required'),
  facts:     z.array(z.string().min(1)).min(1, 'Add at least one fact'),
})

/** Structured body stored in PracticeScenario.content for ARBITRATION_MEDIATION */
export const mediationContentSchema = z.object({
  mode:          z.enum(['mediation', 'arbitration']),
  disputeType:   z.string().min(2, 'Dispute type is required'),
  background:    z.string().min(10, 'Background is required'),
  partyA:        partySchema,
  partyB:        partySchema,
  applicableLaw: z.array(z.string().min(1)).min(1, 'Add at least one applicable law/statute'),
  instructions:  z.string().min(10, 'Instructions are required'),
})

export type MediationContent = z.infer<typeof mediationContentSchema>

export const mediationCreateSchema = z.object({
  title:       z.string().min(3),
  description: z.string().min(10),
  difficulty:  z.enum(['EASY', 'MEDIUM', 'HARD']),
  caseId:      z.string().max(120).optional().nullable(),
  content:     mediationContentSchema,
  isPublished: z.boolean().optional().default(false),
})

export const mediationUpdateSchema = mediationCreateSchema.partial().extend({
  isPublished: z.boolean().optional(),
})
