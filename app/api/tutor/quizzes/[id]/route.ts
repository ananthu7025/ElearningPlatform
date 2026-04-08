import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')
    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: params.id,
        quiz: {
          lesson: {
            module: {
              course: { 
                instituteId: user.instituteId!,
                ...(user.role === 'TUTOR' ? { tutorId: user.userId } : {}),
              },
            },
          },
        },
      },
      include: {
        student: { select: { name: true, email: true } },
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
            lesson: {
              select: {
                moduleId: true,
                module: {
                  select: { courseId: true },
                },
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    return NextResponse.json({ attempt })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')
    const { score, feedback, status } = await req.json()

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: params.id,
        quiz: {
          lesson: {
            module: {
              course: { 
                instituteId: user.instituteId!,
                ...(user.role === 'TUTOR' ? { tutorId: user.userId } : {}),
              },
            },
          },
        },
      },
      include: {
        quiz: {
          select: {
            lessonId: true,
            passingScore: true,
            lesson: {
              select: {
                moduleId: true,
                module: {
                  select: { courseId: true },
                },
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: params.id },
      data: {
        score: score !== undefined ? score : (attempt as any).score,
        tutorFeedback: feedback,
        status: status || 'reviewed',
        tutorId: user.userId,
        reviewedAt: new Date(),
        passed: score !== undefined ? score >= (attempt as any).quiz.passingScore : (attempt as any).passed,
      } as any,
    }) as any

    // Update lesson progress if reviewed and passed
    if (updatedAttempt.status === 'reviewed' && updatedAttempt.passed) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: attempt.studentId,
            courseId: attempt.quiz.lesson.module.courseId,
          },
        },
      })

      if (enrollment) {
        await prisma.lessonProgress.upsert({
          where: {
            enrollmentId_lessonId: {
              enrollmentId: enrollment.id,
              lessonId: attempt.quiz.lessonId,
            },
          },
          create: {
            enrollmentId: enrollment.id,
            lessonId: attempt.quiz.lessonId,
            isCompleted: true,
            completedAt: new Date(),
          },
          update: {
            isCompleted: true,
            completedAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json({ attempt: updatedAttempt })
  } catch (e) {
    return handleRouteError(e)
  }
}
