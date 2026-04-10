import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { PracticeModuleType } from '@prisma/client'
import { clientInterviewUpdateSchema } from '@/lib/practiceLab/clientInterviewScenario'

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

    if (scenario.moduleType !== (params.moduleType as PracticeModuleType)) {
      return errorResponse('VALIDATION', 'Scenario does not belong to this module', 422)
    }

    const body = await req.json()
    const keys = Object.keys(body ?? {})
    const onlyPublish =
      keys.length === 1 && keys[0] === 'isPublished' && typeof body.isPublished === 'boolean'

    if (onlyPublish) {
      const updated = await prisma.practiceScenario.update({
        where: { id: params.id },
        data: { isPublished: body.isPublished as boolean },
      })
      return NextResponse.json({ scenario: { id: updated.id, isPublished: updated.isPublished } })
    }

    if (scenario.moduleType !== PracticeModuleType.CLIENT_INTERVIEW) {
      return errorResponse(
        'VALIDATION',
        'Full edits are only supported for Client Interview scenarios. Use isPublished to publish or unpublish.',
        422
      )
    }

    const parsed = clientInterviewUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors as Record<string, unknown>, 422)
    }

    const d = parsed.data
    if (Object.keys(d).length === 0) {
      return errorResponse('VALIDATION', 'No fields to update', 422)
    }

    const updated = await prisma.practiceScenario.update({
      where: { id: params.id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.difficulty !== undefined && { difficulty: d.difficulty }),
        ...(d.clientName !== undefined && { clientName: d.clientName }),
        ...(d.caseType !== undefined && { caseType: d.caseType }),
        ...(d.caseId !== undefined && { caseId: d.caseId }),
        ...(d.content !== undefined && { content: d.content as object }),
        ...(d.isPublished !== undefined && { isPublished: d.isPublished }),
      },
    })

    return NextResponse.json({
      scenario: {
        id: updated.id,
        title: updated.title,
        isPublished: updated.isPublished,
      },
    })
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
