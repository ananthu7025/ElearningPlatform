import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'

// Paths that skip auth entirely
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
  '/api/webhooks',
  '/api/public',
]

const STATIC = ['/_next', '/vendor', '/css', '/img', '/favicon', '/uploads']

// First path segments that belong to authenticated areas — everything else
// at root level is treated as a public institute slug page
const PROTECTED_SEGMENTS = new Set([
  'admin', 'tutor', 'super-admin', 'dashboard', 'courses', 'learn',
  'practice-lab', 'ai-tutor', 'certificates', 'profile', 'api',
  'login', 'forgot-password', 'reset-password', '_next', 'favicon.ico',
])

// Role → home page
const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/super-admin/dashboard',
  ADMIN:       '/admin/dashboard',
  TUTOR:       '/tutor/dashboard',
  STUDENT:     '/dashboard',
}

// Role → allowed path prefixes
const ROLE_PATHS: Record<string, string[]> = {
  SUPER_ADMIN: ['/super-admin'],
  ADMIN:       ['/admin'],
  TUTOR:       ['/tutor'],
  STUDENT:     ['/dashboard', '/courses', '/learn', '/practice-lab', '/ai-tutor', '/certificates', '/profile'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow static assets
  if (STATIC.some((s) => pathname.startsWith(s))) return NextResponse.next()

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  // Allow public institute slug pages (e.g. /my-institute, /my-institute/courses/...)
  const firstSegment = pathname.split('/')[1] ?? ''
  if (firstSegment && !PROTECTED_SEGMENTS.has(firstSegment)) return NextResponse.next()

  // ── Tenant subdomain — pass as header, resolved by route handlers ──────────
  const host = req.headers.get('host') ?? ''
  const subdomain = host.split('.')[0]
  const isRootDomain = !host.includes('.') || subdomain === 'www' || subdomain === 'lexed' || subdomain === 'localhost'

  const requestHeaders = new Headers(req.headers)
  if (!isRootDomain) {
    requestHeaders.set('x-subdomain', subdomain)
  }

  // ── Auth check ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // If no Bearer token, check cookies (for page navigations)
  if (!token) {
    token = req.cookies.get('access_token')?.value ?? null
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing access token' } },
        { status: 401 }
      )
    }
    // Cookie expired (browser discards it) — try silent refresh before sending to login
    const hasRefreshToken = !!req.cookies.get('refresh_token')?.value
    if (hasRefreshToken) {
      const refreshUrl = new URL('/api/auth/refresh-and-redirect', req.url)
      refreshUrl.searchParams.set('next', pathname + req.nextUrl.search)
      return NextResponse.redirect(refreshUrl)
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const payload = await verifyAccessToken(token)

    // ── Role-based path guard ────────────────────────────────────────────────
    const allowedPrefixes = ROLE_PATHS[payload.role] ?? []
    const isAllowed = allowedPrefixes.some((p) => pathname.startsWith(p))

    if (!isAllowed && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL(ROLE_HOME[payload.role] ?? '/login', req.url))
    }

    // Inject user context into headers for Route Handlers
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)
    if (payload.instituteId) requestHeaders.set('x-institute-id', payload.instituteId)

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Access token expired on a page navigation — try silent refresh if a
    // refresh token cookie is present, then redirect back to the original page.
    const hasRefreshToken = !!req.cookies.get('refresh_token')?.value
    if (hasRefreshToken) {
      const refreshUrl = new URL('/api/auth/refresh-and-redirect', req.url)
      refreshUrl.searchParams.set('next', pathname + req.nextUrl.search)
      return NextResponse.redirect(refreshUrl)
    }

    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|vendor|css|img|uploads|favicon.ico).*)'],
}
