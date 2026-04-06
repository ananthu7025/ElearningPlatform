import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  title:       z.string().min(3).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration:    z.coerce.number().int().positive().optional(),
  meetingUrl:  z.string().url().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const lc = await prisma.liveClass.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
    })
    if (!lc) return errorResponse('NOT_FOUND', 'Live class not found', 404)

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const updated = await prisma.liveClass.update({
      where: { id: params.id },
      data:  { ...parsed.data, ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {}) },
    })

    return NextResponse.json({ liveClass: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const lc = await prisma.liveClass.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
    })
    if (!lc) return errorResponse('NOT_FOUND', 'Live class not found', 404)

    await prisma.liveClass.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
