import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1, 'Required'),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const module = await prisma.module.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
    })
    if (!module) return errorResponse('NOT_FOUND', 'Module not found', 404)

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const updated = await prisma.module.update({
      where: { id: params.id },
      data: { title: parsed.data.title },
    })

    return NextResponse.json({ module: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const module = await prisma.module.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
    })
    if (!module) return errorResponse('NOT_FOUND', 'Module not found', 404)

    await prisma.module.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
