import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')

    const notifications = await prisma.notification.findMany({
      where:   { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })

    return NextResponse.json({ notifications })
  } catch (e) {
    return handleRouteError(e)
  }
}
