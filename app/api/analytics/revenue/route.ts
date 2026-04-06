import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const baseWhere = { course: { instituteId }, status: 'CAPTURED' as const }

    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const [payments, pendingAgg, refundedAgg, paidCount, courseGroups] = await Promise.all([
      prisma.payment.findMany({
        where: { ...baseWhere, createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
        select: { amount: true, createdAt: true },
      }),
      prisma.payment.aggregate({
        where: { course: { instituteId }, status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { course: { instituteId }, status: 'REFUNDED' },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: baseWhere }),
      prisma.payment.groupBy({
        by: ['courseId'],
        where: baseWhere,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    ])

    // Monthly buckets (last 12 months)
    const buckets: Record<string, number> = {}
    payments.forEach((p) => {
      const key = p.createdAt.toISOString().slice(0, 7)
      buckets[key] = (buckets[key] ?? 0) + Number(p.amount)
    })
    const months: { label: string; amount: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push({
        label:  d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        amount: buckets[d.toISOString().slice(0, 7)] ?? 0,
      })
    }

    // Course revenue breakdown
    const courseIds    = courseGroups.map((g) => g.courseId)
    const courseTitles = await prisma.course.findMany({
      where:  { id: { in: courseIds } },
      select: { id: true, title: true },
    })
    const titleMap = Object.fromEntries(courseTitles.map((c) => [c.id, c.title]))
    const COLORS   = ['#7367F0', '#00BAD1', '#28C76F', '#FF9F43', '#FF4C51']
    const LABELS   = ['primary', 'info', 'success', 'warning', 'danger']
    const topAmount = Math.max(...courseGroups.map((g) => Number(g._sum.amount ?? 0)), 1)
    const courseRevenue = courseGroups.map((g, i) => ({
      title:  titleMap[g.courseId] ?? 'Unknown',
      amount: Number(g._sum.amount ?? 0),
      pct:    Math.round((Number(g._sum.amount ?? 0) / topAmount) * 100),
      color:  LABELS[i] ?? 'primary',
      hex:    COLORS[i] ?? '#7367F0',
    }))

    return NextResponse.json({
      months,
      courseRevenue,
      stats: {
        paidCount,
        pendingAmount:   Number(pendingAgg._sum.amount   ?? 0),
        refundedAmount:  Number(refundedAgg._sum.amount  ?? 0),
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
