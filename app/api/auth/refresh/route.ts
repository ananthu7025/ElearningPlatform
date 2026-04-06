import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken } from '@/lib/jwt'
import { redis, redisKeys } from '@/lib/redis'
import { errorResponse } from '@/lib/errors'

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get('refresh_token')?.value
  if (!cookie) return errorResponse('UNAUTHORIZED', 'No refresh token', 401)

  try {
    const payload = await verifyRefreshToken(cookie)

    // Check token is not blacklisted
    if (payload.jti) {
      const blacklisted = await redis.get(redisKeys.blacklist(payload.jti))
      if (blacklisted) return errorResponse('UNAUTHORIZED', 'Token revoked', 401)
    }

    // Verify stored token matches (single active session per user)
    const stored = await redis.get(redisKeys.refreshToken(payload.sub))
    if (stored !== cookie) return errorResponse('UNAUTHORIZED', 'Token reused or expired', 401)

    const accessToken = await signAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      instituteId: payload.instituteId,
    })

    const res = NextResponse.json({ accessToken })
    res.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, // 15 minutes
    })
    return res
  } catch {
    return errorResponse('UNAUTHORIZED', 'Invalid refresh token', 401)
  }
}
