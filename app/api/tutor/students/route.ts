import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('TUTOR')
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId') ?? undefined
    const search   = searchParams.get('search')   ?? undefined
    const sortBy   = searchParams.get('sortBy')   ?? 'progress'
    const page     = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit    = Math.min(50, Number(searchParams.get('limit') ?? 10))

    // All courses owned by this tutor
    const courses = await prisma.course.findMany({
      where: { tutorId: user.userId, instituteId: user.instituteId! },
      select: { id: true, title: true },
    })
    const courseIds = courseId
      ? courses.filter((c) => c.id === courseId).map((c) => c.id)
      : courses.map((c) => c.id)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          courseId: { in: courseIds },
          ...(search
            ? { student: { name: { contains: search, mode: 'insensitive' } } }
            : {}),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              lastLoginAt: true,
              quizAttempts: {
                where: { quiz: { lesson: { module: { courseId: { in: courseIds } } } } },
                select: { score: true },
              },
            },
          },
          course: { select: { id: true, title: true, _count: { select: { modules: true } } } },
          lessonProgress: { select: { completedAt: true } },
        },
        orderBy:
          sortBy === 'lastActive'
            ? { lastAccessedAt: 'desc' }
            : sortBy === 'quizScore'
            ? { completionPercentage: 'desc' }
            : { completionPercentage: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.enrollment.count({
        where: {
          courseId: { in: courseIds },
          ...(search
            ? { student: { name: { contains: search, mode: 'insensitive' } } }
            : {}),
        },
      }),
    ])

    const rows = enrollments.map((e) => {
      const lessonsCompleted = e.lessonProgress.filter((lp) => lp.completedAt).length
      const quizAttempts = e.student.quizAttempts
      const avgQuizScore =
        quizAttempts.length > 0
          ? Math.round(quizAttempts.reduce((a, q) => a + q.score, 0) / quizAttempts.length)
          : null
      const lastActive = e.lastAccessedAt ?? e.student.lastLoginAt
      const isActiveRecently = lastActive ? lastActive >= sevenDaysAgo : false

      return {
        enrollmentId: e.id,
        studentId:    e.student.id,
        name:         e.student.name,
        email:        e.student.email,
        courseId:     e.course.id,
        courseTitle:  e.course.title,
        progress:     e.completionPercentage,
        lessonsCompleted,
        avgQuizScore,
        lastActive,
        isActive:     isActiveRecently,
        isCertified:  e.isCertified,
      }
    })

    // KPIs
    const allProgress = rows.map((r) => r.progress)
    const avgProgress = allProgress.length
      ? Math.round(allProgress.reduce((a, b) => a + b, 0) / allProgress.length)
      : 0
    const allScores = rows.filter((r) => r.avgQuizScore !== null).map((r) => r.avgQuizScore as number)
    const avgQuizScore = allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0
    const atRiskCount = rows.filter((r) => r.progress < 25).length

    return NextResponse.json({
      students: rows,
      total,
      page,
      limit,
      courses,
      kpi: { totalStudents: total, avgProgress, avgQuizScore, atRiskCount },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
