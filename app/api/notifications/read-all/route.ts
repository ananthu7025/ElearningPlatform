import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function PUT() {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')

    await prisma.notification.updateMany({
      where: { userId: user.userId, isRead: false },
      data:  { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
