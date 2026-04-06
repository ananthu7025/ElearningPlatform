import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const tutor = await prisma.user.findFirst({
      where: { id: params.id, instituteId, role: 'TUTOR' },
      select: { id: true, isActive: true },
    })
    if (!tutor) return errorResponse('NOT_FOUND', 'Tutor not found', 404)

    const body = await req.json().catch(() => ({}))
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : !tutor.isActive

    const updated = await prisma.user.update({
      where: { id: params.id },
      data:  { isActive },
      select: { id: true, isActive: true },
    })

    return NextResponse.json({ tutor: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
