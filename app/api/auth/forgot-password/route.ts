import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { errorResponse } from '@/lib/errors'
import { sendEmail } from '@/lib/email'
import { resetPasswordEmail } from '@/emails/templates/reset-password'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return errorResponse('VALIDATION_ERROR', 'Invalid email', 422)

  const user = await prisma.user.findUnique({ where: { email: body.data.email } })

  // Always return 200 to prevent email enumeration
  if (!user) return NextResponse.json({ message: 'If that email exists, a reset link was sent.' })

  const token = crypto.randomUUID()
  await redis.set(`reset:${token}`, user.id, { ex: 60 * 60 }) // 1 hour TTL

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  const { subject, html } = resetPasswordEmail({
    userName:  user.name,
    resetUrl,
    expiresIn: '1 hour',
  })
  await sendEmail({ to: user.email, subject, html })

  return NextResponse.json({ message: 'If that email exists, a reset link was sent.' })
}
