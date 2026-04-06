import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  name:         z.string().min(2).optional(),
  maxStudents:  z.number().int().positive().optional(),
  maxCourses:   z.number().int().positive().optional(),
  maxTutors:    z.number().int().positive().optional(),
  priceMonthly: z.number().positive().optional(),
  features:     z.array(z.string()).optional(),
  isActive:     z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole('SUPER_ADMIN')

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return NextResponse.json({ plan })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole('SUPER_ADMIN')

    const inUse = await prisma.institute.count({ where: { planId: params.id } })
    if (inUse > 0) return errorResponse('CONFLICT', 'Plan is assigned to institutes and cannot be deleted', 409)

    await prisma.plan.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
