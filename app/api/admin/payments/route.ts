import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? undefined
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit  = Math.min(100, Number(searchParams.get('limit') ?? 20))

    const where = {
      enrollment: { course: { instituteId } },
      ...(status ? { status: status as any } : {}),
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true } },
          course:  { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ])

    return NextResponse.json({ payments, total, page, limit })
  } catch (e) {
    return handleRouteError(e)
  }
}
