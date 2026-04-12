import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { PracticeModuleType } from '@prisma/client'
import { clientInterviewUpdateSchema } from '@/lib/practiceLab/clientInterviewScenario'
import { caseDraftUpdateSchema } from '@/lib/practiceLab/caseDraftScenario'
import { contractDraftUpdateSchema } from '@/lib/practiceLab/contractDraftScenario'
import { z } from 'zod'

const UPDATE_SCHEMA_MAP: Record<string, z.ZodTypeAny> = {
  CLIENT_INTERVIEW:  clientInterviewUpdateSchema,
  CASE_DRAFTING:     caseDraftUpdateSchema,
  CONTRACT_DRAFTING: contractDraftUpdateSchema,
}

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

    const updateSchema = UPDATE_SCHEMA_MAP[scenario.moduleType]
    if (!updateSchema) {
      return errorResponse('VALIDATION', 'Full edits are not yet supported for this module type.', 422)
    }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors as Record<string, unknown>, 422)
    }

    const d = parsed.data as Record<string, unknown>
    if (Object.keys(d).length === 0) {
      return errorResponse('VALIDATION', 'No fields to update', 422)
    }

    const updated = await prisma.practiceScenario.update({
      where: { id: params.id },
      data: {
        ...(d.title       != null && { title:       d.title       as string }),
        ...(d.description != null && { description: d.description as string }),
        ...(d.difficulty  != null && { difficulty:  d.difficulty  as 'EASY' | 'MEDIUM' | 'HARD' }),
        ...(d.clientName  !== undefined && { clientName: (d.clientName  as string | null) ?? null }),
        ...(d.caseType    !== undefined && { caseType:   (d.caseType    as string | null) ?? null }),
        ...(d.caseId      !== undefined && { caseId:     (d.caseId      as string | null) ?? null }),
        ...(d.content     != null && { content:     d.content     as object }),
        ...(d.isPublished !== undefined && { isPublished: d.isPublished as boolean }),
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
