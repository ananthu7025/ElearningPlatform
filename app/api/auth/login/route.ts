import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { redis, redisKeys } from '@/lib/redis'
import { errorResponse } from '@/lib/errors'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  // Rate limit: 10 login attempts per IP per 15 minutes (100 in development)
  const ip = getClientIp(req)
  const limit = process.env.NODE_ENV === 'development' ? 100 : 10
  const { allowed, remaining } = await rateLimit({ key: `login:${ip}`, limit, window: 900 })
  if (!allowed) return rateLimitResponse(remaining)

  const body = schema.safeParse(await req.json())
  if (!body.success)
    return errorResponse('VALIDATION_ERROR', body.error.errors[0].message, 422)

  const user = await prisma.user.findUnique({ where: { email: body.data.email } })

  if (!user || !user.isActive || !(await bcrypt.compare(body.data.password, user.passwordHash)))
    return errorResponse('UNAUTHORIZED', 'Invalid credentials', 401)

  const payload = { sub: user.id, email: user.email, role: user.role, instituteId: user.instituteId }
  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  // Store refresh token in Redis (TTL 7 days)
  await redis.set(redisKeys.refreshToken(user.id), refreshToken, { ex: 60 * 60 * 24 * 7 })
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  const res = NextResponse.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, instituteId: user.instituteId },
  })

  res.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
  })

  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return res
}
