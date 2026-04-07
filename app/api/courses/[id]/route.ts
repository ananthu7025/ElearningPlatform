import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  title:               z.string().min(3).optional(),
  description:         z.string().optional(),
  previewDescription:  z.string().optional().nullable(),
  price:               z.coerce.number().nonnegative().optional(),
  thumbnailUrl:        z.string().optional().nullable(),
  tutorId:             z.string().uuid().optional(),
  category:            z.string().optional(),
  isPublicEnrollable:  z.boolean().optional(),
})

async function getCourse(id: string, instituteId: string) {
  const course = await prisma.course.findFirst({
    where: { id, instituteId },
    include: {
      tutor:  { select: { id: true, name: true, email: true } },
      _count: { select: { enrollments: true, modules: true } },
    },
  })
  if (!course) return null
  return course
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')
    const course = await getCourse(params.id, user.instituteId!)
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    // avg completion across all enrollments
    const agg = await prisma.enrollment.aggregate({
      where:   { courseId: params.id },
      _avg:    { completionPercentage: true },
      _count:  { id: true },
    })

    return NextResponse.json({
      course,
      stats: {
        enrolled:       agg._count.id,
        avgCompletion:  Math.round(agg._avg.completionPercentage ?? 0),
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN')
    const existing = await getCourse(params.id, user.instituteId!)
    if (!existing) return errorResponse('NOT_FOUND', 'Course not found', 404)

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const course = await prisma.course.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json({ course })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN')
    const existing = await getCourse(params.id, user.instituteId!)
    if (!existing) return errorResponse('NOT_FOUND', 'Course not found', 404)

    await prisma.course.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
