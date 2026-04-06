import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')

    const institute = await prisma.institute.findUnique({
      where: { id: user.instituteId! },
      include: {
        plan: { select: { id: true, name: true, priceMonthly: true, maxStudents: true, maxCourses: true } },
      },
    })

    if (!institute) {
      return NextResponse.json({ error: 'Institute not found' }, { status: 404 })
    }

    const now = new Date()
    const daysRemaining = institute.trialEndsAt
      ? Math.max(0, Math.ceil((institute.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null

    const trialTotal = institute.trialEndsAt
      ? Math.ceil((institute.trialEndsAt.getTime() - institute.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      status:       institute.status,
      trialEndsAt:  institute.trialEndsAt,
      daysRemaining,
      trialTotal,
      plan:         institute.plan,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
