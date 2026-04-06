# Authentication — How It Works

> Full reference for the auth system in `ledxElearn`.  
> Stack: JWT (jose) · httpOnly cookies · Redis (ioredis) · Zustand · Next.js middleware

---

## Overview

The app uses a **dual-token** strategy:

| Token | Lifespan | Where stored | Purpose |
|---|---|---|---|
| **Access token** | 15 minutes | httpOnly cookie + Zustand memory | Authenticate every API request |
| **Refresh token** | 7 days | httpOnly cookie + Redis | Silently issue new access tokens |

Both tokens are **HS256 JWTs** signed with separate secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).  
Both are stored as `httpOnly` cookies — JavaScript on the page **cannot read them**, which prevents XSS token theft.

---

## Token Payload

Every JWT (access and refresh) carries:

```ts
{
  sub:         string        // userId
  email:       string
  role:        string        // SUPER_ADMIN | ADMIN | TUTOR | STUDENT
  instituteId: string | null // null for SUPER_ADMIN
  jti?:        string        // unique ID on refresh tokens only (for blacklisting)
}
```

---

## Auth Flow — Step by Step

### 1. Login (`POST /api/auth/login`)

```
Client → POST /api/auth/login { email, password }
         ↓
  Rate limit check (10 attempts / IP / 15 min via Redis)
         ↓
  Lookup user in DB → bcrypt.compare(password, passwordHash)
         ↓
  Sign accessToken (15m) + refreshToken (7d, with jti)
         ↓
  Store refreshToken in Redis:  refresh:{userId} = <token>  TTL 7d
  Update user.lastLoginAt
         ↓
  Response:
    - Body:    { accessToken, user }
    - Cookies: access_token (httpOnly, 15m)
               refresh_token (httpOnly, 7d)
```

> Only one active session per user. A new login overwrites the previous refresh token in Redis, invalidating the old session.

---

### 2. Every Authenticated Request

```
Browser → GET /some/page  (cookie: access_token=<jwt>)
           ↓
  middleware.ts reads access_token cookie
           ↓
  verifyAccessToken() — checks signature + expiry
           ↓
  Injects into request headers:
    x-user-id         → userId
    x-user-email      → email
    x-user-role       → role
    x-institute-id    → instituteId (if any)
    x-subdomain       → subdomain (if on a tenant subdomain)
           ↓
  Route Handler reads headers via lib/auth.ts:
    requireUser()     → returns RequestUser or throws UNAUTHORIZED
    requireRole('ADMIN') → same + checks role, throws FORBIDDEN
```

The middleware runs **before** every request (except static assets and public paths).  
Route Handlers never touch the cookie or JWT directly — they only read the headers middleware sets.

---

### 3. Silent Token Refresh (`POST /api/auth/refresh`)

When the access token expires, `lib/api.ts` (Axios interceptor) automatically calls `/api/auth/refresh`:

```
401 from any API call
  ↓
axios interceptor → POST /api/auth/refresh  (sends refresh_token cookie automatically)
  ↓
  Verify refresh token signature
  Check jti not in Redis blacklist (blacklist:{jti})
  Check Redis refresh:{userId} === cookie value  ← prevents token reuse
  ↓
  Sign new accessToken (15m)
  Set new access_token cookie
  ↓
  Retry original request with new token
```

If refresh also fails (expired, blacklisted, reused) → user is redirected to `/login`.

---

### 4. Logout (`POST /api/auth/logout`)

```
Client → POST /api/auth/logout
  ↓
  Verify refresh token from cookie
  Delete Redis key:  refresh:{userId}
  Blacklist jti:     blacklist:{jti} = "1"  TTL 7d
  ↓
  Clear both cookies (maxAge: 0)
  ↓
  Client Zustand store: clear() → user = null, accessToken = null
```

The blacklist TTL matches the refresh token TTL — after 7 days the jti can be safely purged.

---

### 5. Forgot Password

```
POST /api/auth/forgot-password { email }
  ↓
  Lookup user (always return 200 to prevent email enumeration)
  Generate UUID token
  Store in Redis:  reset:{token} = userId  TTL 1 hour
  Send reset email via Resend (lib/email.ts)
  ↓
POST /api/auth/reset-password { token, newPassword }
  ↓
  Look up reset:{token} in Redis → get userId
  bcrypt.hash(newPassword) → update user.passwordHash
  Delete reset:{token} from Redis (one-time use)
```

---

## Key Files

| File | Role |
|---|---|
| `middleware.ts` | Runs on every request — verifies access token, injects user headers, guards routes by role |
| `lib/jwt.ts` | `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken` |
| `lib/auth.ts` | `requireUser()`, `requireRole()` — used inside Route Handlers to read middleware headers |
| `lib/redis.ts` | Redis client + key helpers (`refresh:{userId}`, `blacklist:{jti}`, `reset:{token}`) |
| `lib/api.ts` | Axios instance with 401 interceptor that auto-calls `/api/auth/refresh` |
| `stores/auth.store.ts` | Zustand — holds `user` and `accessToken` in memory on the client |
| `app/api/auth/login/route.ts` | Issues both tokens, sets cookies, stores refresh in Redis |
| `app/api/auth/refresh/route.ts` | Issues new access token using valid refresh token |
| `app/api/auth/logout/route.ts` | Revokes refresh token, blacklists jti, clears cookies |
| `app/api/auth/forgot-password/route.ts` | Generates reset token, stores in Redis, sends email |
| `app/api/auth/reset-password/route.ts` | Validates reset token, updates password, deletes token |

---

## Redis Key Reference

| Key pattern | Value | TTL | Purpose |
|---|---|---|---|
| `refresh:{userId}` | refresh token string | 7 days | Active session — single token per user |
| `blacklist:{jti}` | `"1"` | 7 days | Revoked refresh tokens (logout) |
| `reset:{uuid}` | userId string | 1 hour | Password reset one-time token |
| `rate:{ip}:login:{ip}` | sorted set | 15 min | Login rate limiting per IP |

---

## Role → Route Guards

Defined in `middleware.ts`:

| Role | Allowed path prefixes |
|---|---|
| `SUPER_ADMIN` | `/super-admin` |
| `ADMIN` | `/admin` |
| `TUTOR` | `/tutor` |
| `STUDENT` | `/dashboard`, `/courses`, `/learn`, `/practice-lab`, `/ai-tutor`, `/certificates`, `/profile` |

Any role accessing a path outside its allowed prefixes is redirected to its own home page.  
API routes (`/api/*`) are guarded at the handler level via `requireRole()`.

---

## Security Notes

- **httpOnly cookies** — tokens are invisible to JavaScript; XSS cannot steal them
- **SameSite: lax** — CSRF protection for cookie-based requests
- **Secure: true in production** — cookies only sent over HTTPS
- **Single active session** — new login overwrites Redis refresh token, old session is invalidated
- **Token reuse detection** — refresh route checks stored token matches cookie; mismatch = revoke
- **Rate limiting** — 10 login attempts per IP per 15 minutes
- **Email enumeration prevention** — forgot-password always returns 200 regardless of whether email exists
- **Temporary password** — new institute admins get `ChangeMe@123`; welcome email prompts immediate change
