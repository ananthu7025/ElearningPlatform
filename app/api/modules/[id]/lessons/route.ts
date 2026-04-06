import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({
  title:    z.string().min(1, 'Required'),
  type:     z.enum(['VIDEO', 'PDF', 'QUIZ', 'ASSIGNMENT', 'LIVE']),
  isFreePreview: z.boolean().default(false),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const module = await prisma.module.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
      include: { _count: { select: { lessons: true } } },
    })
    if (!module) return errorResponse('NOT_FOUND', 'Module not found', 404)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const lesson = await prisma.lesson.create({
      data: {
        ...parsed.data,
        moduleId:   params.id,
        orderIndex: module._count.lessons + 1,
      },
    })

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
