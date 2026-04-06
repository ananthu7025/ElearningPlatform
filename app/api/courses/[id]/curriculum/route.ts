import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

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
