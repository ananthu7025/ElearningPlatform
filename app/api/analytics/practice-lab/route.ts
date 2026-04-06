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
    await requireFeature(instituteId, 'practice_lab')

    const [totalSubmissions, uniqueUsers, scenarios] = await Promise.all([
      prisma.practiceSubmission.count({
        where: { scenario: { instituteId } },
      }),
      prisma.practiceSubmission.groupBy({
        by: ['studentId'],
        where: { scenario: { instituteId } },
      }).then((r) => r.length),
      prisma.practiceScenario.findMany({
        where: { instituteId, isActive: true },
        select: {
          id: true, title: true, moduleType: true,
          submissions: { select: { studentId: true, aiScore: true } },
        },
      }),
    ])

    const moduleActivity = scenarios.map((s) => {
      const studentSet = new Set(s.submissions.map((x) => x.studentId))
      const scores     = s.submissions.map((x) => x.aiScore).filter((x): x is number => x !== null)
      return {
        title:      s.title,
        moduleType: s.moduleType,
        students:   studentSet.size,
        avgScore:   scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        pct:        uniqueUsers > 0 ? Math.round((studentSet.size / Math.max(uniqueUsers, 1)) * 100) : 0,
      }
    }).sort((a, b) => b.students - a.students).slice(0, 5)

    // Leaderboard: top students by submission count
    const submissionsByStudent = await prisma.practiceSubmission.groupBy({
      by: ['studentId'],
      where: { scenario: { instituteId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })
    const studentIds = submissionsByStudent.map((s) => s.studentId)
    const studentNames = await prisma.user.findMany({
      where:  { id: { in: studentIds } },
      select: { id: true, name: true, avatarUrl: true },
    })
    const nameMap = Object.fromEntries(studentNames.map((u) => [u.id, u]))
    const leaderboard = submissionsByStudent.map((s, i) => ({
      rank:       i + 1,
      studentId:  s.studentId,
      name:       nameMap[s.studentId]?.name ?? 'Unknown',
      avatarUrl:  nameMap[s.studentId]?.avatarUrl ?? null,
      submissions: s._count.id,
    }))

    const COLORS = ['primary', 'info', 'success', 'warning', 'danger']
    const activityWithColors = moduleActivity.map((m, i) => ({ ...m, color: COLORS[i] ?? 'primary' }))

    return NextResponse.json({
      stats: { totalSubmissions, uniqueUsers, activeModules: scenarios.length },
      moduleActivity: activityWithColors,
      leaderboard,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
