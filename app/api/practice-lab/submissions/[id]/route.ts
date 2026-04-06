import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')

    const where = user.role === 'STUDENT'
      ? { id: params.id, studentId: user.userId }
      : { id: params.id, scenario: { instituteId: user.instituteId! } }

    const submission = await prisma.practiceSubmission.findFirst({
      where,
      include: { scenario: { select: { id: true, title: true } } },
    })
    if (!submission) return errorResponse('NOT_FOUND', 'Submission not found', 404)

    return NextResponse.json({ submission })
  } catch (e) {
    return handleRouteError(e)
  }
}
