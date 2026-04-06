import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    await requireRole('SUPER_ADMIN')

    const { searchParams } = new URL(req.url)
    const status      = searchParams.get('status')      ?? undefined
    const instituteId = searchParams.get('instituteId') ?? undefined
    const page        = Math.max(1, Number(searchParams.get('page')  ?? 1))
    const limit       = Math.min(100, Number(searchParams.get('limit') ?? 20))

    const where = {
      ...(status      ? { status: status as any } : {}),
      ...(instituteId ? { instituteId }           : {}),
    }

    const [payments, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        include: {
          institute: { select: { id: true, name: true, subdomain: true } },
          plan:      { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriptionPayment.count({ where }),
    ])

    return NextResponse.json({ payments, total, page, limit })
  } catch (e) {
    return handleRouteError(e)
  }
}
