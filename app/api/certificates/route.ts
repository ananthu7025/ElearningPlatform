import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireRole('STUDENT')

    // Certificates are enrollments where completion = 100%
    // Find enrollments where all lessons are completed
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.userId },
      include: {
        course: { select: { id: true, title: true, tutor: { select: { name: true } } } },
        lessonProgress: { select: { completedAt: true } },
      },
    })

    const certificates = await Promise.all(
      enrollments.map(async (e: any) => {
        const totalLessons = await prisma.lesson.count({
          where: { module: { courseId: e.courseId } },
        })
        const completed = e.lessonProgress.filter((p: any) => p.completedAt).length
        const isComplete = totalLessons > 0 && completed === totalLessons

        return isComplete
          ? { enrollmentId: e.id, course: e.course, completedAt: e.lessonProgress[e.lessonProgress.length - 1]?.completedAt }
          : null
      })
    )

    return NextResponse.json({ certificates: certificates.filter(Boolean) })
  } catch (e) {
    return handleRouteError(e)
  }
}
