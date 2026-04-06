import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { errorResponse } from '@/lib/errors'

const schema = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return errorResponse('VALIDATION_ERROR', body.error.errors[0].message, 422)

  const userId = await redis.get<string>(`reset:${body.data.token}`)
  if (!userId) return errorResponse('NOT_FOUND', 'Reset token is invalid or expired', 404)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(body.data.newPassword, 10) },
  })

  await redis.del(`reset:${body.data.token}`)

  return NextResponse.json({ message: 'Password updated successfully' })
}
