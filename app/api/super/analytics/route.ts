import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    await requireRole('SUPER_ADMIN')

    const now        = new Date()
    const yearStart  = new Date(now.getFullYear(), 0, 1)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1)

    // Start of current ISO week (Monday)
    const dayOfWeek  = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon … 6=Sun
    const weekStart  = new Date(now)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - dayOfWeek)

    const [
      totalInstitutes,
      activeInstitutes,
      suspendedInstitutes,
      totalStudents,
      totalRevenueAgg,
      refundsTotalAgg,
      revenueThisMonthAgg,
      revenueLastMonthAgg,
      pendingApproval,
      newThisMonth,
      planGroups,
      recentInstitutesRaw,
      topPayments,
      yearPayments,
      weekPayments,
    ] = await Promise.all([
      prisma.institute.count(),
      prisma.institute.count({ where: { status: 'ACTIVE' } }),
      prisma.institute.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),

      // All-time captured revenue (gross)
      prisma.subscriptionPayment.aggregate({
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
      }),

      // All-time refunded amount
      prisma.subscriptionPayment.aggregate({
        where: { status: 'REFUNDED' },
        _sum: { amount: true },
      }),

      // This month captured
      prisma.subscriptionPayment.aggregate({
        where: { status: 'CAPTURED', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),

      // Last month captured (for MoM % change)
      prisma.subscriptionPayment.aggregate({
        where: { status: 'CAPTURED', createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
        _sum: { amount: true },
      }),

      prisma.institute.count({ where: { status: 'TRIAL' } }),
      prisma.institute.count({ where: { createdAt: { gte: monthStart } } }),

      prisma.institute.groupBy({
        by: ['planId'],
        _count: { _all: true },
      }),

      prisma.institute.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, status: true, createdAt: true,
          plan: { select: { name: true } },
        },
      }),

      // Top institutes by revenue
      prisma.subscriptionPayment.groupBy({
        by: ['instituteId'],
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 6,
      }),

      // This year's payments for monthly chart
      prisma.subscriptionPayment.findMany({
        where: { status: 'CAPTURED', createdAt: { gte: yearStart } },
        select: { amount: true, createdAt: true },
      }),

      // This week's payments for weekly chart
      prisma.subscriptionPayment.findMany({
        where: { status: 'CAPTURED', createdAt: { gte: weekStart } },
        select: { amount: true, createdAt: true },
      }),
    ])

    // ── Plan distribution ─────────────────────────────────────────────────────
    const planIds = planGroups.map((g) => g.planId)
    const plans   = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    })
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]))
    const planDistribution = planGroups.map((g) => ({
      planName: planMap[g.planId] ?? 'Unknown',
      count:    g._count._all,
    }))

    // ── Top institutes by revenue ─────────────────────────────────────────────
    let topInstitutes: Array<{ name: string; revenue: number }> = []
    if (topPayments.length > 0) {
      const topInstIds     = topPayments.map((p) => p.instituteId)
      const topInstDetails = await prisma.institute.findMany({
        where: { id: { in: topInstIds } },
        select: { id: true, name: true },
      })
      const instMap = Object.fromEntries(topInstDetails.map((i) => [i.id, i.name]))
      topInstitutes = topPayments.map((p) => ({
        name:    instMap[p.instituteId] ?? 'Unknown',
        revenue: Number(p._sum.amount ?? 0),
      }))
    }

    // ── Monthly revenue array (index 0 = Jan) ─────────────────────────────────
    const monthlyRevenue = Array<number>(12).fill(0)
    for (const p of yearPayments) {
      monthlyRevenue[p.createdAt.getMonth()] += Number(p.amount)
    }

    // ── Weekly revenue array (index 0 = Mon, 6 = Sun) ────────────────────────
    const weeklyRevenue = Array<number>(7).fill(0)
    for (const p of weekPayments) {
      const d   = p.createdAt.getDay()
      const idx = d === 0 ? 6 : d - 1 // Sunday → 6, Mon → 0
      weeklyRevenue[idx] += Number(p.amount)
    }

    // ── Revenue figures ───────────────────────────────────────────────────────
    const totalRevenue     = Number(totalRevenueAgg._sum.amount    ?? 0)
    const refundsTotal     = Number(refundsTotalAgg._sum.amount    ?? 0)
    const revenueThisMonth = Number(revenueThisMonthAgg._sum.amount ?? 0)
    const revenueLastMonth = Number(revenueLastMonthAgg._sum.amount ?? 0)
    const netRevenue       = totalRevenue - refundsTotal

    // Month-over-month % change (null when no prior data)
    const momChange: number | null = revenueLastMonth > 0
      ? Number((((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1))
      : null

    const recentInstitutes = recentInstitutesRaw.map((i) => ({
      id:        i.id,
      name:      i.name,
      planName:  i.plan.name,
      status:    i.status as string,
      createdAt: i.createdAt.toISOString(),
    }))

    return NextResponse.json({
      totalInstitutes,
      activeInstitutes,
      suspendedInstitutes,
      totalStudents,
      totalRevenue,
      netRevenue,
      refundsTotal,
      revenueThisMonth,
      revenueLastMonth,
      momChange,
      newThisMonth,
      pendingApproval,
      planDistribution,
      topInstitutes,
      recentInstitutes,
      monthlyRevenue,
      weeklyRevenue,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
