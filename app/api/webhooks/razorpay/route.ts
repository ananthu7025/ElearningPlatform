import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET!

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expected !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'payment.failed') {
    const paymentId = event.payload?.payment?.entity?.id
    if (paymentId) {
      await prisma.payment.updateMany({
        where: { razorpayPaymentId: paymentId },
        data:  { status: 'FAILED' },
      })
    }
  }

  return NextResponse.json({ received: true })
}
