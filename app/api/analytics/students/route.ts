import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'
import { requireFeature } from '@/lib/planGate'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!
    await requireFeature(instituteId, 'advanced_analytics')

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const students = await prisma.user.findMany({
      where: { instituteId, role: 'STUDENT', isActive: true },
      select: {
        id: true, name: true, email: true, avatarUrl: true, lastLoginAt: true,
        enrollments: {
          where:  { course: { instituteId } },
          select: { completionPercentage: true, isCertified: true },
        },
        quizAttempts: { select: { score: true } },
      },
      orderBy: { lastLoginAt: 'desc' },
      take: 100,
    })

    const rows = students.map((s) => {
      const courseCount  = s.enrollments.length
      const avgProgress  = courseCount > 0
        ? Math.round(s.enrollments.reduce((a, e) => a + e.completionPercentage, 0) / courseCount)
        : 0
      const quizCount    = s.quizAttempts.length
      const avgScore     = quizCount > 0
        ? Math.round(s.quizAttempts.reduce((a, q) => a + q.score, 0) / quizCount)
        : null
      const isActive     = s.lastLoginAt ? s.lastLoginAt >= sevenDaysAgo : false
      const isCompleted  = courseCount > 0 && s.enrollments.every((e) => e.completionPercentage === 100)

      return {
        id: s.id, name: s.name, email: s.email, avatarUrl: s.avatarUrl,
        lastLoginAt: s.lastLoginAt,
        courseCount, avgProgress, quizCount, avgScore,
        status: isCompleted ? 'Completed' : isActive ? 'Active' : 'Inactive',
      }
    })

    // KPI summary
    const avgCompletion = rows.length > 0
      ? Math.round(rows.reduce((a, r) => a + r.avgProgress, 0) / rows.length)
      : 0
    const allScores = rows.filter((r) => r.avgScore !== null).map((r) => r.avgScore as number)
    const avgQuizScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0
    const inactiveCount   = rows.filter((r) => r.status === 'Inactive').length
    const completedCount  = rows.filter((r) => r.status === 'Completed').length

    return NextResponse.json({
      students: rows,
      kpi: { avgCompletion, avgQuizScore, inactiveCount, completedCount },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
