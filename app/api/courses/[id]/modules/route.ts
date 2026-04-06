import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({ title: z.string().min(1, 'Required') })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const course = await prisma.course.findFirst({
      where: { id: params.id, instituteId: user.instituteId! },
      include: { _count: { select: { modules: true } } },
    })
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const module = await prisma.module.create({
      data: {
        title:      parsed.data.title,
        courseId:   params.id,
        orderIndex: course._count.modules + 1,
      },
    })

    return NextResponse.json({ module }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
