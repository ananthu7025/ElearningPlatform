import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT')

    const { searchParams } = new URL(req.url)
    const code     = searchParams.get('code')?.toUpperCase()
    const courseId = searchParams.get('courseId')

    if (!code || !courseId) return errorResponse('VALIDATION', 'code and courseId required', 422)

    const coupon = await prisma.coupon.findFirst({
      where: {
        code,
        instituteId: user.instituteId!,
        isActive:    true,
        expiresAt:   { gt: new Date() },
      },
    })

    if (!coupon) return errorResponse('NOT_FOUND', 'Invalid or expired coupon', 404)

    const course = await prisma.course.findFirst({
      where: { id: courseId, instituteId: user.instituteId! },
      select: { price: true },
    })
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    const originalPrice = Number(course.price)
    const discount = coupon.discountType === 'PERCENTAGE'
      ? originalPrice * (Number(coupon.discountValue) / 100)
      : Math.min(Number(coupon.discountValue), originalPrice)

    return NextResponse.json({
      valid:         true,
      discountType:  coupon.discountType,
      discountValue: coupon.discountValue,
      originalPrice,
      finalPrice:    Math.max(0, originalPrice - discount),
      discount,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
