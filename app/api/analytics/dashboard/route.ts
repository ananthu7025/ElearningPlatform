import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const [
      totalStudents,
      totalCourses,
      publishedCourses,
      totalTutors,
      totalRevenueAgg,
      thisMonthRevenueAgg,
      recentEnrollments,
      totalCompletions,
      totalCertificates,
      institute,
    ] = await Promise.all([
      prisma.user.count({ where: { instituteId, role: 'STUDENT' } }),
      prisma.course.count({ where: { instituteId } }),
      prisma.course.count({ where: { instituteId, status: 'PUBLISHED' } }),
      prisma.user.count({ where: { instituteId, role: 'TUTOR' } }),
      prisma.payment.aggregate({
        where: { course: { instituteId }, status: 'CAPTURED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { course: { instituteId }, status: 'CAPTURED', capturedAt: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.enrollment.count({
        where: { course: { instituteId }, enrolledAt: { gte: thisMonthStart } },
      }),
      prisma.enrollment.count({
        where: { course: { instituteId }, completionPercentage: 100 },
      }),
      prisma.enrollment.count({
        where: { course: { instituteId }, isCertified: true },
      }),
      prisma.institute.findUnique({
        where: { id: instituteId },
        select: { plan: { select: { name: true, features: true } } },
      }),
    ])

    return NextResponse.json({
      totalStudents,
      totalCourses,
      publishedCourses,
      totalTutors,
      totalRevenue:      Number(totalRevenueAgg._sum.amount     ?? 0),
      thisMonthRevenue:  Number(thisMonthRevenueAgg._sum.amount ?? 0),
      recentEnrollments,
      totalCompletions,
      totalCertificates,
      plan: {
        name:     institute?.plan.name     ?? '',
        features: (institute?.plan.features as string[]) ?? [],
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
