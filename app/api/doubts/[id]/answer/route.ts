import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({ answer: z.string().min(5, 'Please provide a meaningful answer') })

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const doubt = await prisma.doubt.findFirst({
      where: { id: params.id, lesson: { module: { course: { instituteId: user.instituteId! } } } },
    })
    if (!doubt) return errorResponse('NOT_FOUND', 'Doubt not found', 404)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const updated = await prisma.doubt.update({
      where: { id: params.id },
      data:  { answer: parsed.data.answer, answeredAt: new Date(), tutorId: user.userId },
    })

    // TODO: create notification for doubt.userId

    return NextResponse.json({ doubt: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
