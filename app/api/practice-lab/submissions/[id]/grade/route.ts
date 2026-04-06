import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({
  score:    z.number().min(0).max(100),
  feedback: z.string().min(5, 'Provide feedback'),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const submission = await prisma.practiceSubmission.findFirst({
      where: { id: params.id, scenario: { instituteId: user.instituteId! } },
    })
    if (!submission) return errorResponse('NOT_FOUND', 'Submission not found', 404)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const updated = await prisma.practiceSubmission.update({
      where: { id: params.id },
      data:  { 
        tutorScore:    parsed.data.score, 
        tutorFeedback: parsed.data.feedback, 
        status:        'evaluated',
        evaluatedAt:   new Date() 
      },
    })

    return NextResponse.json({ submission: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
