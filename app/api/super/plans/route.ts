import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse, handleRouteError } from '@/lib/errors'

const createSchema = z.object({
  name:         z.string().min(2),
  maxStudents:  z.number().int().positive(),
  maxCourses:   z.number().int().positive(),
  maxTutors:    z.number().int().positive(),
  priceMonthly: z.number().positive(),
  features:     z.array(z.string()),
})

export async function GET() {
  try {
    await requireRole('SUPER_ADMIN')
    const plans = await prisma.plan.findMany({
      orderBy: { priceMonthly: 'asc' },
      include: { _count: { select: { institutes: true } } },
    })
    return NextResponse.json({ plans })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('SUPER_ADMIN')

    const body = createSchema.safeParse(await req.json())
    if (!body.success) return errorResponse('VALIDATION_ERROR', body.error.errors[0].message, 422)

    const plan = await prisma.plan.create({ data: body.data })
    return NextResponse.json({ plan }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
