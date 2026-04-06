import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken } from '@/lib/jwt'
import { redis, redisKeys } from '@/lib/redis'

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get('refresh_token')?.value

  if (cookie) {
    try {
      const payload = await verifyRefreshToken(cookie)
      // Delete stored token + blacklist the jti
      await redis.del(redisKeys.refreshToken(payload.sub))
      if (payload.jti) {
        await redis.set(redisKeys.blacklist(payload.jti), '1', { ex: 60 * 60 * 24 * 7 })
      }
    } catch {
      // Token already invalid — still clear the cookie
    }
  }

  const res = NextResponse.json({ message: 'Logged out' })
  res.cookies.set('access_token', '', { httpOnly: true, maxAge: 0, path: '/' })
  res.cookies.set('refresh_token', '', { httpOnly: true, maxAge: 0, path: '/' })
  return res
}
