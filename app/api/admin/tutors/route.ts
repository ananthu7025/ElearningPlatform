import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { checkTutorLimit } from '@/lib/planGate'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name:  z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit  = Math.min(50, Number(searchParams.get('limit') ?? 20))

    const where = {
      instituteId,
      role: 'TUTOR' as const,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [tutors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, createdAt: true, lastLoginAt: true,
          _count: { select: { taughtCourses: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({ tutors, total, page, limit })
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

    // TODO: send invite email with tempPassword via Resend
    console.log(`Tutor invite: ${parsed.data.email} / ${tempPassword}`)

    return NextResponse.json({ tutor, tempPassword }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
