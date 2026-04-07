import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; courseId: string } }
) {
  try {
    const institute = await prisma.institute.findFirst({
      where: {
        OR: [{ publicSlug: params.slug }, { subdomain: params.slug }],
        isPublic: true,
      },
      select: { id: true },
    })
    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found', 404)

    const course = await prisma.course.findFirst({
      where: {
        id:                 params.courseId,
        instituteId:        institute.id,
        status:             'PUBLISHED',
        isPublicEnrollable: true,
      },
      include: {
        tutor: { select: { name: true, avatarUrl: true } },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id:            true,
                title:         true,
                type:          true,
                orderIndex:    true,
                isFreePreview: true,
                durationSeconds: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    })
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    return NextResponse.json({ course })
  } catch (e) {
    return handleRouteError(e)
  }
}
