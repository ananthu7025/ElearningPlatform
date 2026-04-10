import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'
import { requireFeature } from '@/lib/planGate'
import { PracticeModuleType } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')
    await requireFeature(user.instituteId!, 'practice_lab')

    const instituteId = user.instituteId!

    const disabledModules = await prisma.practiceModule.findMany({
      where: { instituteId, isEnabled: false },
      select: { moduleType: true },
    })
    const disabledTypes = new Set(disabledModules.map((m) => m.moduleType))

    const studentWhere =
      user.role === 'STUDENT'
        ? {
            isPublished: true,
            isActive: true,
            ...(disabledTypes.size > 0
              ? { moduleType: { notIn: [...disabledTypes] as PracticeModuleType[] } }
              : {}),
          }
        : {}

    const scenarios = await prisma.practiceScenario.findMany({
      where: {
        instituteId,
        ...studentWhere,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ scenarios })
  } catch (e) {
    return handleRouteError(e)
  }
}
