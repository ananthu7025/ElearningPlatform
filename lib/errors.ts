import { NextResponse } from 'next/server'

export function errorResponse(code: string, message: string | Record<string, unknown>, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

// Catches common thrown strings from lib/auth.ts and maps to HTTP responses
export function handleRouteError(e: unknown) {
  if (e instanceof Error) {
    if (e.message === 'UNAUTHORIZED') return errorResponse('UNAUTHORIZED', 'Not authenticated', 401)
    if (e.message === 'FORBIDDEN') return errorResponse('FORBIDDEN', 'Insufficient role', 403)
    if (e.message === 'NOT_FOUND') return errorResponse('NOT_FOUND', 'Resource not found', 404)
    if (e.message === 'CONFLICT') return errorResponse('CONFLICT', 'Resource already exists', 409)
    if (e.message.startsWith('FEATURE_LOCKED:')) {
      const feature = e.message.replace('FEATURE_LOCKED:', '')
      return errorResponse('FEATURE_LOCKED', `This feature (${feature}) is not available on your current plan. Please upgrade.`, 403)
    }
  }
  console.error(e)
  return errorResponse('INTERNAL_ERROR', 'Something went wrong', 500)
}
