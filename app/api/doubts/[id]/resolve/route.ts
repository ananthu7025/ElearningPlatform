import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN', 'STUDENT')

    const doubt = await prisma.doubt.findFirst({
      where: { id: params.id, lesson: { module: { course: { instituteId: user.instituteId! } } } },
    })
    if (!doubt) return errorResponse('NOT_FOUND', 'Doubt not found', 404)

    // Students can only resolve their own doubts
    if (user.role === 'STUDENT' && doubt.studentId !== user.userId) {
      return errorResponse('FORBIDDEN', 'Not authorized', 403)
    }

    const updated = await prisma.doubt.update({
      where: { id: params.id },
      data:  { isResolved: true },
    })

    return NextResponse.json({ doubt: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
