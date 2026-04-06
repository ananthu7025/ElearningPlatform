# Phase 1 — Auth

> Read `tasks/CONTEXT.md` first.

## Goal
Complete authentication end-to-end: API routes + login/forgot/reset pages wired to real API + middleware protecting all routes.

---

## Task Checklist

### Prisma Schema & DB
- [x] `prisma/schema.prisma` ✅
- [x] `prisma/seed.ts` ✅
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Run `npx prisma db seed` — verify seeded users in Prisma Studio

### API Routes
- [x] `app/api/health/route.ts` — GET /api/health ✅
- [x] `app/api/auth/login/route.ts` — POST ✅
- [x] `app/api/auth/refresh/route.ts` — POST ✅
- [x] `app/api/auth/logout/route.ts` — POST ✅
- [x] `app/api/auth/forgot-password/route.ts` — POST ✅ (Resend TODO left)
- [x] `app/api/auth/reset-password/route.ts` — POST ✅

### Middleware
- [ ] `middleware.ts` — complete tenant resolution (resolve subdomain → instituteId from DB with Redis cache)

### UI Pages (migrate + optimize from `ledx/app/login/`)
- [x] `app/(auth)/login/page.tsx` ✅
- [ ] `app/(auth)/forgot-password/page.tsx`
- [ ] `app/(auth)/reset-password/page.tsx`

### Lib / Stores
- [x] `lib/jwt.ts` ✅
- [x] `lib/auth.ts` ✅
- [x] `lib/api.ts` ✅
- [x] `stores/auth.store.ts` ✅
- [ ] Verify token refresh interceptor works end-to-end

---

## Implementation Notes

### Login page — what to keep from ledx, what to change

**Keep (styles intact):**
- Two-column layout: left gradient panel + right form card
- The stat bubbles (250+ Institutes, 18K+ Students, 99.9% Uptime) — but make them configurable via constants
- All Bootstrap form classes on the inputs
- The show/hide password toggle button structure

**Change (optimize):**
- Replace `useState` form fields → `react-hook-form` with Zod schema
- Replace inline `style={{}}` everywhere with Bootstrap utility classes
- Replace `<a href="/super-admin/dashboard">` mock submit → real `api.post('/auth/login')`
- Extract left panel into `LoginIllustration` sub-component (it's ~30 lines of its own)
- Role-based redirect after login using `ROLE_HOME` map
- Show server error in a `<div className="alert alert-danger">` that already exists in the ledx UI

**Zod schema for login:**
```ts
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
})
```

### Login API route — implementation

```ts
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { redis, redisKeys } from '@/lib/redis'
import { errorResponse } from '@/lib/errors'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success)
    return errorResponse('VALIDATION_ERROR', body.error.errors[0].message, 422)

  const user = await prisma.user.findUnique({
    where: { email: body.data.email },
    include: { institute: { select: { id: true, subdomain: true } } },
  })

  if (!user || !user.isActive)
    return errorResponse('UNAUTHORIZED', 'Invalid credentials', 401)

  const valid = await bcrypt.compare(body.data.password, user.passwordHash)
  if (!valid)
    return errorResponse('UNAUTHORIZED', 'Invalid credentials', 401)

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    instituteId: user.instituteId,
  }

  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  // Store hashed refresh token in Redis (TTL 7 days)
  await redis.set(redisKeys.refreshToken(user.id), refreshToken, { ex: 60 * 60 * 24 * 7 })

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  const res = NextResponse.json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      instituteId: user.instituteId,
    },
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
```

### Refresh route
```ts
// Reads refresh_token cookie → verifies → checks Redis (not blacklisted) → issues new access token
```

### Logout route
```ts
// Reads refresh_token cookie → adds jti to Redis blacklist → clears cookie
```

### Middleware — tenant resolution (complete the TODO)
```ts
// After extracting subdomain:
const cached = await redis.get(redisKeys.tenantSubdomain(subdomain))
let instituteId = cached as string | null

if (!instituteId) {
  const institute = await prisma.institute.findUnique({
    where: { subdomain },
    select: { id: true, status: true },
  })
  if (!institute || institute.status === 'SUSPENDED') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Institute not found' } }, { status: 404 })
  }
  instituteId = institute.id
  await redis.set(redisKeys.tenantSubdomain(subdomain), instituteId, { ex: 300 }) // 5 min cache
}
```

---

## Files to Create in This Phase

```
prisma/
  schema.prisma           ← copy from /Users/ananthu/LMS/docs/DATABASE.md prisma block
  seed.ts                 ← seed script

app/
  (auth)/
    login/page.tsx        ← migrated + optimized from ledx
    forgot-password/page.tsx
    reset-password/page.tsx
  api/
    auth/
      login/route.ts
      refresh/route.ts
      logout/route.ts
      forgot-password/route.ts
      reset-password/route.ts
```

---

## Done Criteria

- [ ] `POST /api/auth/login` returns access token + sets cookie
- [ ] Login page submits form, stores token in Zustand, redirects by role
- [ ] Token refresh interceptor in `lib/api.ts` retries failed requests after auto-refresh
- [ ] `POST /api/auth/logout` blacklists token + clears cookie
- [ ] Forgot password sends real email via Resend
- [ ] All protected routes redirect to `/login` when token is missing/expired
- [ ] Login page has no inline styles (all converted to Bootstrap utilities)
- [ ] Login form uses react-hook-form + Zod (no raw useState for form fields)

---

## Last Worked On
2026-04-03 — Phase 1 in progress.
- ✅ All 5 auth API routes written (login, refresh, logout, forgot-password, reset-password)
- ✅ Prisma schema + seed script written
- ✅ Login page migrated + optimized (RHF + Zod, no inline styles, LeftPanel extracted)
- ⏳ Next: forgot-password page, reset-password page, run migrations, wire Resend email
