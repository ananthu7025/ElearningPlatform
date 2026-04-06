import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { checkTutorLimit } from '@/lib/planGate'
import { sendTutorInviteEmail } from '@/lib/email'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name:  z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
})

function deriveStatus(isActive: boolean, lastLoginAt: Date | null): 'ACTIVE' | 'INVITED' | 'INACTIVE' {
  if (!isActive) return 'INACTIVE'
  if (!lastLoginAt) return 'INVITED'
  return 'ACTIVE'
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit  = Math.min(10000, Number(searchParams.get('limit') ?? 20))

    const baseWhere = {
      instituteId,
      role: 'TUTOR' as const,
    }

    const statusFilter =
      status === 'ACTIVE'   ? { isActive: true,  NOT: { lastLoginAt: null } } :
      status === 'INVITED'  ? { isActive: true,  lastLoginAt: null }          :
      status === 'INACTIVE' ? { isActive: false }                             :
      {}

    const where = {
      ...baseWhere,
      ...statusFilter,
      ...(search ? {
        OR: [
          { name:  { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    }

    const [tutorsRaw, total, totalCount, activeCount, invitedCount, inactiveCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, avatarUrl: true,
          isActive: true, createdAt: true, lastLoginAt: true,
          _count: { select: { taughtCourses: true } },
          taughtCourses: {
            select: { _count: { select: { enrollments: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: baseWhere }),
      prisma.user.count({ where: { ...baseWhere, isActive: true, NOT: { lastLoginAt: null } } }),
      prisma.user.count({ where: { ...baseWhere, isActive: true, lastLoginAt: null } }),
      prisma.user.count({ where: { ...baseWhere, isActive: false } }),
    ])

    const tutors = tutorsRaw.map((t) => ({
      id:           t.id,
      name:         t.name,
      email:        t.email,
      avatarUrl:    t.avatarUrl,
      isActive:     t.isActive,
      lastLoginAt:  t.lastLoginAt,
      createdAt:    t.createdAt,
      status:       deriveStatus(t.isActive, t.lastLoginAt),
      courseCount:  t._count.taughtCourses,
      studentCount: t.taughtCourses.reduce((sum, c) => sum + c._count.enrollments, 0),
    }))

    return NextResponse.json({
      tutors,
      total,
      page,
      limit,
      stats: { total: totalCount, active: activeCount, invited: invitedCount, inactive: inactiveCount },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const limit = await checkTutorLimit(instituteId)
    if (!limit.allowed) return errorResponse('PLAN_LIMIT', limit.message, 403)

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (exists) return errorResponse('CONFLICT', 'Email already registered', 409)

    const tempPassword = Math.random().toString(36).slice(-10)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const tutor = await prisma.user.create({
      data: {
        name:         parsed.data.name,
        email:        parsed.data.email,
        passwordHash,
        role:         'TUTOR',
        instituteId,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    await sendTutorInviteEmail({ to: tutor.email, name: tutor.name, tempPassword })

    return NextResponse.json({ tutor, tempPassword }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
