import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const user = await requireRole('STUDENT')

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: user.userId, courseId: params.courseId },
    })
    if (!enrollment) return errorResponse('NOT_FOUND', 'Not enrolled', 404)

    const progress = await prisma.lessonProgress.findMany({
      where: { enrollment: { studentId: user.userId, courseId: params.courseId } },
      select: { lessonId: true, completedAt: true, watchPercentage: true },
    })

    return NextResponse.json({ progress })
  } catch (e) {
    return handleRouteError(e)
  }
}
