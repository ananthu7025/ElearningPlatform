import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('STUDENT')

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.userId },
      include: {
        course: {
          include: {
            tutor:   { select: { id: true, name: true } },
            _count:  { select: { modules: true } },
          },
        },
        lessonProgress: { select: { lessonId: true, completedAt: true, watchPercentage: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    // Add completion percentage to each enrollment
    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const totalLessons = await prisma.lesson.count({
          where: { module: { courseId: e.courseId } },
        })
        const completed = e.lessonProgress.filter((p: any) => p.completedAt).length
        return {
          ...e,
          totalLessons,
          completedLessons: completed,
          completionPct: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
        }
      })
    )

    return NextResponse.json({ enrollments: enriched })
  } catch (e) {
    return handleRouteError(e)
  }
}
