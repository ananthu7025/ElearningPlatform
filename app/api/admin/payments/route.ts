import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? ''
    const search = searchParams.get('search') ?? ''
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit  = Math.min(10000, Number(searchParams.get('limit') ?? 20))

    const baseWhere = { course: { instituteId } }

    const statusFilter = status ? { status: status as any } : {}

    const searchFilter = search
      ? {
          OR: [
            { student: { name:  { contains: search, mode: 'insensitive' as const } } },
            { student: { email: { contains: search, mode: 'insensitive' as const } } },
            { course:  { title: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}

    const where = { ...baseWhere, ...statusFilter, ...searchFilter }

    // ── Aggregate stats (always over full institute, ignoring filters) ──
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const [
      payments,
      total,
      capturedAgg,
      thisMonthAgg,
      pendingAgg,
      refundedAgg,
    ] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true, avatarUrl: true } },
          course:  { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where: { ...baseWhere, status: 'CAPTURED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { ...baseWhere, status: 'CAPTURED', capturedAt: { gte: thisMonthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { ...baseWhere, status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...baseWhere, status: 'REFUNDED' },
        _sum: { amount: true },
      }),
    ])

    // ── Monthly trend (last 6 months, CAPTURED only) ───────────────────
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const trendPayments = await prisma.payment.findMany({
      where: { ...baseWhere, status: 'CAPTURED', capturedAt: { gte: sixMonthsAgo } },
      select: { amount: true, capturedAt: true },
    })

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyMap: Record<string, { month: string; amount: number }> = {}
    for (let i = 0; i < 6; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = { month: MONTH_NAMES[d.getMonth()], amount: 0 }
    }
    for (const p of trendPayments) {
      if (!p.capturedAt) continue
      const d = new Date(p.capturedAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].amount += Number(p.amount)
    }
    const monthlyTrend = Object.values(monthlyMap)
    const maxMonthly   = Math.max(...monthlyTrend.map((m) => m.amount), 1)
    const trend = monthlyTrend.map((m) => ({
      ...m,
      pct: Math.round((m.amount / maxMonthly) * 100),
    }))

    // ── Revenue by course (top 5, CAPTURED only) ──────────────────────
    const courseGroups = await prisma.payment.groupBy({
      by: ['courseId'],
      where: { ...baseWhere, status: 'CAPTURED' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    })
    const courseIds     = courseGroups.map((g) => g.courseId)
    const courseTitles  = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    })
    const titleMap = Object.fromEntries(courseTitles.map((c) => [c.id, c.title]))
    const topCourseAmount = Math.max(...courseGroups.map((g) => Number(g._sum.amount ?? 0)), 1)
    const courseRevenue = courseGroups.map((g) => ({
      courseId: g.courseId,
      title:    titleMap[g.courseId] ?? 'Unknown',
      amount:   Number(g._sum.amount ?? 0),
      pct:      Math.round((Number(g._sum.amount ?? 0) / topCourseAmount) * 100),
    }))

    const COLORS = ['primary', 'info', 'success', 'warning', 'danger']
    const HEX    = ['#7367F0', '#00BAD1', '#28C76F', '#FF9F43', '#FF4C51']

    return NextResponse.json({
      payments,
      total,
      page,
      limit,
      stats: {
        totalRevenue:    Number(capturedAgg._sum.amount    ?? 0),
        thisMonthRevenue: Number(thisMonthAgg._sum.amount  ?? 0),
        thisMonthCount:  thisMonthAgg._count,
        paidCount:       capturedAgg._count,
        pendingAmount:   Number(pendingAgg._sum.amount     ?? 0),
        refundedAmount:  Number(refundedAgg._sum.amount    ?? 0),
      },
      monthlyTrend: trend,
      courseRevenue: courseRevenue.map((c, i) => ({
        ...c,
        color: COLORS[i] ?? 'primary',
        hex:   HEX[i]    ?? '#7367F0',
      })),
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
