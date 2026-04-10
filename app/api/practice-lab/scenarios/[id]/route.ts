import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')
    const instituteId = user.instituteId!

    const scenario = await prisma.practiceScenario.findFirst({
      where: { id: params.id, instituteId },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    if (user.role === 'STUDENT') {
      if (!scenario.isPublished || !scenario.isActive) {
        return errorResponse('NOT_FOUND', 'Scenario not found', 404)
      }
      const mod = await prisma.practiceModule.findUnique({
        where: { instituteId_moduleType: { instituteId, moduleType: scenario.moduleType } },
      })
      if (mod && !mod.isEnabled) {
        return errorResponse('NOT_FOUND', 'Scenario not found', 404)
      }
    }

    return NextResponse.json({ scenario })
  } catch (e) {
    return handleRouteError(e)
  }
}
