import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR', 'STUDENT')

    // Students must be enrolled in the course
    if (user.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId: params.id, studentId: user.userId },
      })
      if (!enrollment) return errorResponse('FORBIDDEN', 'Not enrolled in this course', 403)
    }

    const course = await prisma.course.findFirst({
      where: { id: params.id, instituteId: user.instituteId! },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, type: true, orderIndex: true, durationSeconds: true, isFreePreview: true },
            },
          },
        },
      },
    })

    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)
    return NextResponse.json({ modules: course.modules })
  } catch (e) {
    return handleRouteError(e)
  }
}
