import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { PracticeModuleType } from '@prisma/client'

const VALID_TYPES = Object.values(PracticeModuleType)

export async function PATCH(
  req: NextRequest,
  { params }: { params: { moduleType: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    // params.moduleType is the enum value (e.g. "CLIENT_INTERVIEW")
    const moduleType = params.moduleType as PracticeModuleType
    if (!VALID_TYPES.includes(moduleType)) {
      return errorResponse('VALIDATION', 'Invalid module type', 422)
    }

    // Upsert: if no row exists yet, create with toggled default (false = disabled)
    const existing = await prisma.practiceModule.findUnique({
      where: { instituteId_moduleType: { instituteId, moduleType } },
    })

    const nextEnabled = existing ? !existing.isEnabled : false

    const updated = await prisma.practiceModule.upsert({
      where: { instituteId_moduleType: { instituteId, moduleType } },
      create: { instituteId, moduleType, isEnabled: nextEnabled },
      update: { isEnabled: nextEnabled },
    })

    return NextResponse.json({ isEnabled: updated.isEnabled })
  } catch (e) {
    return handleRouteError(e)
  }
}
