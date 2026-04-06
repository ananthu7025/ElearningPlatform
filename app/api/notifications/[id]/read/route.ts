import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')

    await prisma.notification.updateMany({
      where: { id: params.id, userId: user.userId },
      data:  { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
