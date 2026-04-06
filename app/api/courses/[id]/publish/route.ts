import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN')

    const course = await prisma.course.findFirst({
      where: { id: params.id, instituteId: user.instituteId! },
    })
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    const updated = await prisma.course.update({
      where: { id: params.id },
      data: { status: newStatus },
    })

    return NextResponse.json({ course: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
