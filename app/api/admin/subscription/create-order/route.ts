import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST() {
  try {
    const user = await requireRole('ADMIN')

    const institute = await prisma.institute.findUnique({
      where:   { id: user.instituteId! },
      include: { plan: true },
    })

    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found', 404)
    if (institute.status === 'ACTIVE') return errorResponse('CONFLICT', 'Institute is already active', 409)

    const amountPaise = Math.round(Number(institute.plan.priceMonthly) * 100)

    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `sub_${institute.id.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes:    {
        instituteId: institute.id,
        planId:      institute.planId,
        type:        'subscription',
      },
    })

    return NextResponse.json({
      orderId:    order.id,
      amount:     order.amount,
      currency:   order.currency,
      keyId:      process.env.RAZORPAY_KEY_ID,
      planName:   institute.plan.name,
      instituteName: institute.name,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
