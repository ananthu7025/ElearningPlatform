# Project Context — Read Before Starting Any Session

## What is this project?

`ledxElearn` is a multi-tenant white-label LMS for law coaching institutes.
Built with Next.js 14 App Router (full-stack — frontend + API routes in one project) + Python FastAPI AI service.

## Key paths

| Thing | Path |
|---|---|
| This project | `/Users/ananthu/LMS/ledxElearn` |
| UI reference (already built) | `/Users/ananthu/LMS/ledx` |
| Architecture doc | `/Users/ananthu/LMS/docs/ARCHITECTURE.md` |
| API reference | `/Users/ananthu/LMS/docs/API.md` |
| DB schema | `/Users/ananthu/LMS/docs/DATABASE.md` |
| Build rules | `/Users/ananthu/LMS/ledxElearn/docs/BUILD_GUIDE.md` |
| Task status | `/Users/ananthu/LMS/ledxElearn/tasks/STATUS.md` |

## Tech Stack

- **Framework:** Next.js 14 App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Vuexy Bootstrap 5 theme — vendor CSS at `/public/vendor/css/core.css`. **Never modify vendor CSS. Keep all Bootstrap/Vuexy class names exactly as-is.**
- **ORM:** Prisma + PostgreSQL
- **Auth:** JWT (access token in Zustand memory) + httpOnly cookie (refresh token) + Redis blacklist
- **Forms:** React Hook Form + Zod (no raw onChange state)
- **Data fetching:** Axios (`lib/api.ts`) with auto refresh interceptor
- **State:** Zustand (`stores/auth.store.ts`)
- **Background jobs:** BullMQ + Redis (`worker/`)
- **AI:** Python FastAPI at port 8000 (separate process)

## Role-based routing

```
/login, /forgot-password, /reset-password   → (auth) group — no layout
/dashboard, /courses, /learn, ...           → (student) group
/admin/dashboard, /admin/courses, ...       → (admin) group
/tutor/dashboard, /tutor/courses, ...       → (tutor) group
/super-admin/dashboard, ...                 → (super-admin) group
```

## Key files already written

| File | Purpose |
|---|---|
| `lib/prisma.ts` | Prisma singleton |
| `lib/redis.ts` | Upstash Redis client + key helpers |
| `lib/jwt.ts` | signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken |
| `lib/auth.ts` | requireUser(), requireRole() for Route Handlers |
| `lib/api.ts` | Axios client with 401 auto-refresh interceptor |
| `lib/errors.ts` | errorResponse(), handleRouteError() — handles UNAUTHORIZED, FORBIDDEN, FEATURE_LOCKED:key, etc. |
| `lib/planFeatures.ts` | Canonical plan feature keys (machine-readable) + FEATURE_CATEGORIES for UI grouping |
| `lib/planGate.ts` | requireFeature(), checkStudentLimit(), checkCourseLimit(), checkTutorLimit() |
| `stores/auth.store.ts` | Zustand auth store (user, accessToken, setAuth, clear) |
| `types/index.ts` | Shared TypeScript types |
| `middleware.ts` | JWT guard + tenant resolution skeleton |
| `components/BootstrapClient.tsx` | Bootstrap JS init on client |

## UI Migration Rules (summary — full version in BUILD_GUIDE.md)

1. Never paste raw HTML blocks — extract components
2. Replace all hardcoded data with API calls
3. Keep all Bootstrap/Vuexy CSS classes exactly as-is
4. Remove inline `style={{}}` — use Bootstrap utility classes
5. Split files over 150 lines
6. Consolidate multiple useState into useReducer or single state object
7. All forms use React Hook Form + Zod
8. Remove dead code, console.logs, unused imports
9. Loading and error states are mandatory on every data-fetching page
10. No `any` — type everything

## Multi-tenancy

Subdomain → institute mapping. `middleware.ts` reads `host` header, resolves institute, injects `x-institute-id` header. All DB queries filter by `instituteId`.

## Error response shape

```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

Use `handleRouteError(e)` from `lib/errors.ts` in every route's catch block.

## How to run

```bash
cd /Users/ananthu/LMS/ledxElearn
npm run dev          # Next.js on :3000
npm run worker       # BullMQ worker (separate terminal)
# Python AI: cd ai-service && uvicorn app.main:app --port 8000
```
