import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({ recordingUrl: z.string().url().optional() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const lc = await prisma.liveClass.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
    })
    if (!lc) return errorResponse('NOT_FOUND', 'Live class not found', 404)

    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)

    const updated = await prisma.liveClass.update({
      where: { id: params.id },
      data: {
        status:       'ended',
        recordingUrl: parsed.success ? parsed.data.recordingUrl : undefined,
      },
    })

    return NextResponse.json({ liveClass: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
