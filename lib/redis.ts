import IoRedis from 'ioredis'

const client = new IoRedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: null,
})

// Thin wrapper that matches the @upstash/redis API used across the app
export const redis = {
  ping: () => client.ping(),

  get: <T = string>(key: string): Promise<T | null> =>
    client.get(key) as Promise<T | null>,

  set: (key: string, value: string, opts?: { ex?: number }) => {
    if (opts?.ex) return client.set(key, value, 'EX', opts.ex)
    return client.set(key, value)
  },

  del: (...keys: string[]) => client.del(...keys),

  pipeline: () => {
    const pipe = client.pipeline()
    const wrapper = {
      zremrangebyscore: (key: string, min: number, max: number) => {
        pipe.zremrangebyscore(key, min, max)
        return wrapper
      },
      zadd: (key: string, member: { score: number; member: string }) => {
        pipe.zadd(key, member.score, member.member)
        return wrapper
      },
      zcard: (key: string) => {
        pipe.zcard(key)
        return wrapper
      },
      expire: (key: string, seconds: number) => {
        pipe.expire(key, seconds)
        return wrapper
      },
      exec: () => pipe.exec().then(results =>
        results?.map(([, val]) => val) ?? []
      ),
    }
    return wrapper
  },
}

// Key helpers — keeps key naming consistent across the app
export const redisKeys = {
  refreshToken: (userId: string) => `refresh:${userId}`,
  blacklist: (jti: string) => `blacklist:${jti}`,
  tenantSubdomain: (subdomain: string) => `tenant:${subdomain}`,
  rateLimit: (ip: string, route: string) => `rate:${ip}:${route}`,
}
