import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({ lessonIds: z.array(z.string().uuid()) })

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const module = await prisma.module.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
    })
    if (!module) return errorResponse('NOT_FOUND', 'Module not found', 404)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    await Promise.all(
      parsed.data.lessonIds.map((id, index) =>
        prisma.lesson.update({ where: { id }, data: { orderIndex: index + 1 } })
      )
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
