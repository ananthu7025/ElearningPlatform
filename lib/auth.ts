import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

// Read the user and institute that middleware.ts injects into request headers
export interface RequestUser {
  userId: string
  email: string
  role: string
  instituteId: string | null
}

// Use inside Route Handlers — reads headers set by middleware
export async function getRequestUser(): Promise<RequestUser | null> {
  const headerList = await headers()
  const userId = headerList.get('x-user-id')
  if (!userId) return null
  return {
    userId,
    email: headerList.get('x-user-email') ?? '',
    role: headerList.get('x-user-role') ?? '',
    instituteId: headerList.get('x-institute-id'),
  }
}

// Use inside Route Handlers — throws if not authenticated
export async function requireUser(): Promise<RequestUser> {
  const user = await getRequestUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

// Use inside Route Handlers — throws if role doesn't match
export async function requireRole(...roles: string[]): Promise<RequestUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN')
  return user
}

// Reads instituteId from request headers (set by middleware)
export function getInstituteId(req: NextRequest): string | null {
  return req.headers.get('x-institute-id')
}
