import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { checkStudentLimit } from '@/lib/planGate'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const inviteSchema = z.object({
  name:  z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const { searchParams } = new URL(req.url)
    const search   = searchParams.get('search') ?? ''
    const courseId = searchParams.get('courseId') ?? ''
    const payment  = searchParams.get('payment') ?? ''   // PAID | PENDING | NONE
    const page     = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit    = Math.min(50, Number(searchParams.get('limit') ?? 20))

    const where: any = {
      instituteId,
      role: 'STUDENT',
      ...(search ? {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(courseId ? { enrollments: { some: { courseId } } } : {}),
    }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

    const [students, total, totalPaid, activeToday] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, avatarUrl: true,
          createdAt: true, lastLoginAt: true,
          _count: { select: { enrollments: true } },
          enrollments: {
            select: {
              completionPercentage: true,
              payment: { select: { status: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.user.count({
        where: {
          instituteId, role: 'STUDENT',
          enrollments: { some: { payment: { status: 'CAPTURED' } } },
        },
      }),
      prisma.user.count({
        where: { instituteId, role: 'STUDENT', lastLoginAt: { gte: todayStart } },
      }),
    ])

    // Compute per-student derived fields and apply payment filter
    let result = students.map((s) => {
      const enrs = s.enrollments
      const avgProgress = enrs.length > 0
        ? Math.round(enrs.reduce((a, e) => a + e.completionPercentage, 0) / enrs.length)
        : 0
      const hasPaid    = enrs.some((e) => e.payment?.status === 'CAPTURED')
      const hasPending = enrs.some((e) => e.payment?.status === 'PENDING')
      const paymentStatus = hasPaid ? 'PAID' : hasPending ? 'PENDING' : 'NONE'
      const { enrollments, ...rest } = s
      return { ...rest, avgProgress, paymentStatus }
    })

    if (payment) result = result.filter((s) => s.paymentStatus === payment)

    return NextResponse.json({
      students: result,
      total,
      page,
      limit,
      stats: {
        total,
        paid:    totalPaid,
        activeToday,
        pending: total - totalPaid,
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const limit = await checkStudentLimit(instituteId)
    if (!limit.allowed) return errorResponse('PLAN_LIMIT', limit.message, 403)

    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (exists) return errorResponse('CONFLICT', 'Email already registered', 409)

    const tempPassword = Math.random().toString(36).slice(-10)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const student = await prisma.user.create({
      data: {
        name:         parsed.data.name,
        email:        parsed.data.email,
        passwordHash,
        role:         'STUDENT',
        instituteId,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    // TODO: send invite email with tempPassword via Resend
    console.log(`Student invite: ${parsed.data.email} / ${tempPassword}`)

    return NextResponse.json({ student, tempPassword }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
