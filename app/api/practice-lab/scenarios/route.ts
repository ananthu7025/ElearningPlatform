import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { requireFeature } from '@/lib/planGate'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')
    await requireFeature(user.instituteId!, 'practice_lab')

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId') ?? undefined

    const scenarios = await prisma.practiceScenario.findMany({
      where: {
        instituteId: user.instituteId!,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ scenarios })
  } catch (e) {
    return handleRouteError(e)
  }
}
