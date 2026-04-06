import { redis } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitOptions {
  key:      string   // e.g. 'login:1.2.3.4'
  limit:    number   // max requests
  window:   number   // seconds
}

export async function rateLimit({ key, limit, window }: RateLimitOptions): Promise<{ allowed: boolean; remaining: number }> {
  const redisKey = `rateLimit:${key}`
  const now = Date.now()
  const windowMs = window * 1000

  // Sliding window using sorted set
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(redisKey, 0, now - windowMs)
  pipeline.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` })
  pipeline.zcard(redisKey)
  pipeline.expire(redisKey, window)

  const results = await pipeline.exec()
  const count   = results?.[2] as number ?? 0

  return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export function rateLimitResponse(remaining: number) {
  return NextResponse.json(
    { error: 'Too many requests', code: 'RATE_LIMITED' },
    { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}
