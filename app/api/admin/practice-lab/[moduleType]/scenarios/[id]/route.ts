import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { PracticeModuleType } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { moduleType: string; id: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const scenario = await prisma.practiceScenario.findFirst({
      where: { id: params.id, instituteId },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    const body = await req.json()

    if (typeof body.isPublished !== 'boolean') {
      return errorResponse('VALIDATION', 'isPublished must be a boolean', 422)
    }

    const updated = await prisma.practiceScenario.update({
      where: { id: params.id },
      data: { isPublished: body.isPublished as boolean },
    })

    return NextResponse.json({ scenario: { id: updated.id, isPublished: updated.isPublished } })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { moduleType: string; id: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const scenario = await prisma.practiceScenario.findFirst({
      where: { id: params.id, instituteId },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    // Soft delete
    await prisma.practiceScenario.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
