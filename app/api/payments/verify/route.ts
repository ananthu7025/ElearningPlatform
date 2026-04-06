import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  razorpay_order_id:   z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature:  z.string(),
  courseId:            z.string().uuid(),
  amount:              z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, amount } = parsed.data

    // Verify Razorpay signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return errorResponse('UNAUTHORIZED', 'Invalid payment signature', 401)
    }

    // Create enrollment + payment record
    const [enrollment] = await prisma.$transaction([
      prisma.enrollment.create({
        data: { studentId: user.userId, courseId },
      }),
      prisma.payment.create({
        data: {
          studentId:         user.userId,
          courseId,
          razorpayOrderId:  razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount,
          status:           'CAPTURED',
        },
      }),
    ])

    return NextResponse.json({ success: true, enrollment })
  } catch (e) {
    return handleRouteError(e)
  }
}
