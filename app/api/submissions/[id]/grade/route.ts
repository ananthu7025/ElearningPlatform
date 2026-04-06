import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({
  grade:    z.number().nonnegative(),
  feedback: z.string().min(5, 'Provide feedback'),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const submission = await prisma.assignmentSubmission.findFirst({
      where: { id: params.id, assignment: { lesson: { module: { course: { instituteId: user.instituteId! } } } } },
      include: { assignment: true },
    })
    if (!submission) return errorResponse('NOT_FOUND', 'Submission not found', 404)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    if (parsed.data.grade > submission.assignment.maxScore) {
      return errorResponse('VALIDATION', `Grade cannot exceed ${submission.assignment.maxScore}`, 422)
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: params.id },
      data:  { grade: parsed.data.grade, feedback: parsed.data.feedback, gradedAt: new Date(), tutorId: user.userId },
    })

    // TODO: create notification for submission.userId

    return NextResponse.json({ submission: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
