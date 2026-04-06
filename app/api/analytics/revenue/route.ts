import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    // Last 12 months revenue grouped by month
    const payments = await prisma.payment.findMany({
      where: {
        enrollment: { course: { instituteId } },
        status: 'CAPTURED',
        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      select: { amount: true, createdAt: true },
    })

    // Build monthly buckets
    const buckets: Record<string, number> = {}
    payments.forEach((p: { amount: any; createdAt: Date }) => {
      const key = p.createdAt.toISOString().slice(0, 7) // YYYY-MM
      buckets[key] = (buckets[key] ?? 0) + Number(p.amount)
    })

    // Generate last 12 month keys
    const months: { label: string; amount: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      months.push({
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        amount: buckets[key] ?? 0,
      })
    }

    return NextResponse.json({ months })
  } catch (e) {
    return handleRouteError(e)
  }
}
