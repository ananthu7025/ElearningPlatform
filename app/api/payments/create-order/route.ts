import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'
import Razorpay from 'razorpay'

const schema = z.object({
  courseId:   z.string().uuid(),
  couponCode: z.string().optional(),
})

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { courseId, couponCode } = parsed.data

    const course = await prisma.course.findFirst({
      where: { id: courseId, instituteId: user.instituteId!, status: 'PUBLISHED' },
    })
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    const alreadyEnrolled = await prisma.enrollment.findFirst({
      where: { studentId: user.userId, courseId },
    })
    if (alreadyEnrolled) return errorResponse('CONFLICT', 'Already enrolled', 409)

    let finalAmount = Number(course.price)

    // Apply coupon
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code:        couponCode,
          instituteId: user.instituteId!,
          isActive:    true,
          expiresAt:   { gt: new Date() },
        },
      })
      if (!coupon) return errorResponse('NOT_FOUND', 'Invalid or expired coupon', 404)

      if (coupon.discountType === 'PERCENTAGE') {
        finalAmount = finalAmount * (1 - Number(coupon.discountValue) / 100)
      } else {
        finalAmount = Math.max(0, finalAmount - Number(coupon.discountValue))
      }
    }

    // Free course — enroll directly
    if (finalAmount === 0) {
      const enrollment = await prisma.enrollment.create({
        data: { studentId: user.userId, courseId },
      })
      return NextResponse.json({ enrolled: true, enrollment })
    }

    const order = await razorpay.orders.create({
      amount:   Math.round(finalAmount * 100), // paise
      currency: 'INR',
      receipt:  `order_${Date.now()}`,
    })

    return NextResponse.json({
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      keyId:     process.env.RAZORPAY_KEY_ID,
      courseId,
      finalAmount,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
