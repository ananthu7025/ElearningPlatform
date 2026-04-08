import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    // All assignments from institute (and tutor if applicable)
    const assignments = await prisma.assignment.findMany({
      where: {
        lesson: {
          module: {
            course: {
              instituteId: user.instituteId!,
              ...(user.role === 'TUTOR' ? { tutorId: user.userId } : {}),
            },
          },
        },
      },
      include: {
        lesson: {
          select: {
            title: true,
            module: {
              select: {
                title: true,
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
        submissions: {
          select: { id: true, grade: true, gradedAt: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const rows = assignments.map((a) => {
      const pending   = a.submissions.filter((s) => s.grade == null).length
      const reviewed  = a.submissions.filter((s) => s.grade != null).length
      const reviewedThisWeek = a.submissions.filter((s) => s.gradedAt && s.gradedAt >= sevenDaysAgo).length
      const avgScore  = reviewed > 0
        ? Math.round(a.submissions.filter((s) => s.grade != null).reduce((acc, s) => acc + (s.grade ?? 0), 0) / reviewed)
        : null

      return {
        id:           a.id,
        title:        a.title,
        maxScore:     a.maxScore,
        dueDate:      a.dueDate,
        courseId:     a.lesson.module.course.id,
        courseTitle:  a.lesson.module.course.title,
        moduleTitle:  a.lesson.module.title,
        lessonTitle:  a.lesson.title,
        totalSubmissions: a.submissions.length,
        pending,
        reviewed,
        reviewedThisWeek,
        avgScore,
      }
    })

    const totalPending         = rows.reduce((s, r) => s + r.pending, 0)
    const totalReviewedThisWeek = rows.reduce((s, r) => s + r.reviewedThisWeek, 0)
    const allAvgScores         = rows.filter((r) => r.avgScore !== null).map((r) => r.avgScore as number)
    const overallAvgScore      = allAvgScores.length
      ? Math.round(allAvgScores.reduce((a, b) => a + b, 0) / allAvgScores.length)
      : null

    return NextResponse.json({
      assignments: rows,
      kpi: { totalPending, totalReviewedThisWeek, overallAvgScore },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
