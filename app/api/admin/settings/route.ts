import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  isPublic:   z.boolean().optional(),
  publicSlug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
    .optional()
    .nullable(),
})

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole('ADMIN')
    const instituteId = auth.instituteId!

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: {
        id:           true,
        name:         true,
        subdomain:    true,
        logoUrl:      true,
        primaryColor: true,
        phone:        true,
        region:       true,
        isPublic:     true,
        publicSlug:   true,
        status:       true,
        plan: { select: { name: true, maxStudents: true, maxCourses: true, maxTutors: true } },
        _count: { select: { courses: true, users: true } },
      },
    })

    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found', 404)

    return NextResponse.json({ institute })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole('ADMIN')
    const instituteId = auth.instituteId!

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { isPublic, publicSlug } = parsed.data

    // If setting a publicSlug, verify it's not taken by another institute
    if (publicSlug) {
      const conflict = await prisma.institute.findFirst({
        where: { publicSlug, NOT: { id: instituteId } },
        select: { id: true },
      })
      if (conflict) return errorResponse('CONFLICT', 'This slug is already taken. Choose another.', 409)
    }

    const institute = await prisma.institute.update({
      where: { id: instituteId },
      data: {
        ...(typeof isPublic !== 'undefined' ? { isPublic } : {}),
        ...(typeof publicSlug !== 'undefined' ? { publicSlug } : {}),
      },
      select: { id: true, isPublic: true, publicSlug: true },
    })

    return NextResponse.json({ institute })
  } catch (e) {
    return handleRouteError(e)
  }
}
