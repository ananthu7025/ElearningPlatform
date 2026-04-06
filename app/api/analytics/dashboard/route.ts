import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const [
      totalStudents,
      totalCourses,
      publishedCourses,
      totalTutors,
      totalRevenue,
      recentEnrollments,
    ] = await Promise.all([
      prisma.user.count({ where: { instituteId, role: 'STUDENT' } }),
      prisma.course.count({ where: { instituteId } }),
      prisma.course.count({ where: { instituteId, status: 'PUBLISHED' } }),
      prisma.user.count({ where: { instituteId, role: 'TUTOR' } }),
      prisma.payment.aggregate({
        where: { enrollment: { course: { instituteId } }, status: 'CAPTURED' },
        _sum: { amount: true },
      }),
      prisma.enrollment.count({
        where: {
          course: { instituteId },
          enrolledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    return NextResponse.json({
      totalStudents,
      totalCourses,
      publishedCourses,
      totalTutors,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      recentEnrollments,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
