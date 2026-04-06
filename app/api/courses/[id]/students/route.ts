import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const course = await prisma.course.findFirst({
      where: { id: params.id, instituteId: user.instituteId! },
    })
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(50, Number(searchParams.get('limit') ?? 20))

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: params.id },
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.enrollment.count({ where: { courseId: params.id } }),
    ])

    return NextResponse.json({ enrollments, total, page, limit })
  } catch (e) {
    return handleRouteError(e)
  }
}
