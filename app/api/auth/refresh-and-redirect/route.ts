import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken } from '@/lib/jwt'
import { redis, redisKeys } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get('next') ?? '/'
  const loginUrl = new URL('/login', req.url)

  const cookie = req.cookies.get('refresh_token')?.value
  if (!cookie) return NextResponse.redirect(loginUrl)

  try {
    const payload = await verifyRefreshToken(cookie)

    // Check token is not blacklisted
    if (payload.jti) {
      const blacklisted = await redis.get(redisKeys.blacklist(payload.jti))
      if (blacklisted) return NextResponse.redirect(loginUrl)
    }

    // Verify stored token matches (single active session per user)
    const stored = await redis.get(redisKeys.refreshToken(payload.sub))
    if (stored !== cookie) return NextResponse.redirect(loginUrl)

    const accessToken = await signAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      instituteId: payload.instituteId,
    })

    const destination = new URL(next, req.url)
    const res = NextResponse.redirect(destination)
    res.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, // 15 minutes
    })
    return res
  } catch {
    return NextResponse.redirect(loginUrl)
  }
}
