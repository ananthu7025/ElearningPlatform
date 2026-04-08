import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET(req: Request) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // 'submitted' or 'reviewed'
    const courseId = searchParams.get('courseId')

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quiz: {
          lesson: {
            module: {
              course: {
                instituteId: user.instituteId!,
                ...(user.role === 'TUTOR' ? { tutorId: user.userId } : {}),
                ...(courseId ? { id: courseId } : {}),
              },
            },
          },
        },
        ...(status ? { status } : {}),
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            lesson: {
              select: {
                module: {
                  select: {
                    course: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { takenAt: 'desc' },
    })

    return NextResponse.json({ attempts })
  } catch (e) {
    return handleRouteError(e)
  }
}
