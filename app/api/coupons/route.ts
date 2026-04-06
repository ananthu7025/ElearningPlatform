import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const createSchema = z.object({
  code:          z.string().min(3).toUpperCase(),
  discountType:  z.enum(['PERCENTAGE', 'FLAT']),
  discountValue: z.coerce.number().positive(),
  maxUses:       z.coerce.number().int().positive().optional(),
  expiresAt:     z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const coupons = await prisma.coupon.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ coupons })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const exists = await prisma.coupon.findFirst({
      where: { code: parsed.data.code, instituteId },
    })
    if (exists) return errorResponse('CONFLICT', 'Coupon code already exists', 409)

    const coupon = await prisma.coupon.create({
      data: {
        code:          parsed.data.code,
        discountType:  parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        maxUses:       parsed.data.maxUses,
        instituteId,
        expiresAt:     parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    })

    return NextResponse.json({ coupon }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
