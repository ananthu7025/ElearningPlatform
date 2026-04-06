import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { enqueueCertificate } from '@/lib/queue'
import { z } from 'zod'

const schema = z.object({
  lessonId:    z.string().uuid(),
  watchPercentage: z.number().min(0).max(100).default(0),
  completed:   z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { lessonId, watchPercentage, completed } = parsed.data

    // Verify lesson belongs to an enrolled course
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: user.userId, courseId: lesson.module.courseId },
    })
    if (!enrollment) return errorResponse('FORBIDDEN', 'Not enrolled', 403)

    const progress = await prisma.lessonProgress.upsert({
      where:  { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      update: {
        watchPercentage: Math.max(watchPercentage, 0),
        ...(completed ? { completedAt: new Date() } : {}),
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        watchPercentage,
        completedAt: completed ? new Date() : null,
      },
    })

    // Check if course is now 100% complete — issue certificate
    if (completed) {
      const totalLessons = await prisma.lesson.count({
        where: { module: { courseId: lesson.module.courseId } },
      })
      const completedLessons = await prisma.lessonProgress.count({
        where: { enrollmentId: enrollment.id, completedAt: { not: null } },
      })
      if (totalLessons > 0 && completedLessons >= totalLessons && !enrollment.certificateKey) {
        await enqueueCertificate({
          enrollmentId: enrollment.id,
          userId:       user.userId,
          courseId:     lesson.module.courseId,
        })
      }
    }

    return NextResponse.json({ progress })
  } catch (e) {
    return handleRouteError(e)
  }
}
