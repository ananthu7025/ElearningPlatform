import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function POST(_req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const user = await requireRole('STUDENT')
    const { courseId } = params

    // 1. Find the enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.userId,
          courseId,
        },
      },
    })

    if (!enrollment) {
      return errorResponse('NOT_FOUND', 'Enrollment not found', 404)
    }

    // 2. Perform the reset in a transaction
    await prisma.$transaction([
      // Delete all lesson progress
      prisma.lessonProgress.deleteMany({
        where: { enrollmentId: enrollment.id },
      }),
      // Reset the enrollment data
      prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          completionPercentage: 0,
          isCertified: false,
          certificateKey: null,
          lastAccessedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({ message: 'Course progress reset successfully' })
  } catch (e) {
    return handleRouteError(e)
  }
}
