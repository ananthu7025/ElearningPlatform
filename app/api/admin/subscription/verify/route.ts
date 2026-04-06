import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { subscriptionPaidEmail } from '@/emails/templates/subscription-paid'

const schema = z.object({
  razorpay_order_id:   z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature:  z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data

    // Verify Razorpay signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return errorResponse('UNAUTHORIZED', 'Invalid payment signature', 401)
    }

    const institute = await prisma.institute.findUnique({
      where:   { id: user.instituteId! },
      include: { plan: true },
    })

    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found', 404)

    const now = new Date()
    const billingPeriodStart = now
    const billingPeriodEnd   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.$transaction([
      // Activate the institute
      prisma.institute.update({
        where: { id: institute.id },
        data:  { status: 'ACTIVE', trialEndsAt: null },
      }),
      // Record the subscription payment
      prisma.subscriptionPayment.create({
        data: {
          instituteId:       institute.id,
          planId:            institute.planId,
          razorpayPaymentId: razorpay_payment_id,
          amount:            institute.plan.priceMonthly,
          currency:          'INR',
          billingPeriodStart,
          billingPeriodEnd,
          status:            'CAPTURED',
        },
      }),
    ])

    // Send confirmation email to the admin
    const adminUser = await prisma.user.findFirst({
      where: { instituteId: institute.id, role: 'ADMIN' },
      select: { name: true, email: true },
    })
    if (adminUser) {
      const { subject, html } = subscriptionPaidEmail({
        adminName:        adminUser.name,
        instituteName:    institute.name,
        planName:         institute.plan.name,
        amount:           Number(institute.plan.priceMonthly),
        billingPeriodEnd,
        loginUrl:         `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
      })
      await sendEmail({ to: adminUser.email, subject, html })
    }

    return NextResponse.json({ success: true, status: 'ACTIVE' })
  } catch (e) {
    return handleRouteError(e)
  }
}
