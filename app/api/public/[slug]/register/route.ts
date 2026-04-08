import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { redis, redisKeys } from '@/lib/redis'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { checkStudentLimit } from '@/lib/planGate'

const schema = z.object({
  name:     z.string().min(2, 'Name is required'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const institute = await prisma.institute.findFirst({
      where: {
        OR: [{ publicSlug: params.slug }, { subdomain: params.slug }],
        isPublic: true,
      },
      select: { id: true, name: true },
    })
    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found or not public', 404)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    // Check student plan limit
    const limit = await checkStudentLimit(institute.id)
    if (!limit.allowed) return errorResponse('PLAN_LIMIT', limit.message, 403)

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existing) return errorResponse('CONFLICT', 'An account with this email already exists', 409)

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)

    const user = await prisma.user.create({
      data: {
        name:         parsed.data.name,
        email:        parsed.data.email,
        passwordHash,
        role:         'STUDENT',
        instituteId:  institute.id,
        emailVerified: false,
      },
    })

    // Issue tokens immediately (no email verification required by default)
    const tokenPayload = { sub: user.id, email: user.email, role: user.role, instituteId: user.instituteId }
    const accessToken  = await signAccessToken(tokenPayload)
    const refreshToken = await signRefreshToken(tokenPayload)

    await redis.set(redisKeys.refreshToken(user.id), refreshToken, { ex: 60 * 60 * 24 * 7 })
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const res = NextResponse.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: null, instituteId: user.instituteId },
    }, { status: 201 })

    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })

    return res
  } catch (e) {
    return handleRouteError(e)
  }
}
