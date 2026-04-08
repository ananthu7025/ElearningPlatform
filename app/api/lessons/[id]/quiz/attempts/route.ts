import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const attemptSchema = z.object({
  answers: z.record(z.string()), // { "0": "A", "1": "Paris" }
  timeTakenSeconds: z.number().int().nonnegative().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('STUDENT')

    // Find the lesson and its associated quiz
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: { 
        quiz: { 
          include: { 
            questions: { orderBy: { orderIndex: 'asc' } } 
          } 
        } 
      },
    })

    if (!lesson || !lesson.quiz) {
      return errorResponse('NOT_FOUND', 'Quiz not found for this lesson', 404)
    }

    const body = await req.json()
    const parsed = attemptSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { answers, timeTakenSeconds } = parsed.data
    const questions = lesson.quiz.questions

    // Calculate score on the backend for security/record-keeping
    let correct = 0
    questions.forEach((q, i) => {
      const userAns = (answers[i] || '').trim().toLowerCase()
      const correctAns = (q.correctAnswer || '').trim().toLowerCase()
      if (userAns === correctAns) correct++
    })

    const score = Math.round((correct / questions.length) * 100)
    const passed = score >= lesson.quiz.passingScore

    // Record the attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        studentId: user.userId,
        quizId: lesson.quiz.id,
        answers: answers as any,
        score,
        passed,
        timeTakenSeconds,
      },
    })

    // Note: We are NOT marking the lesson as complete here.
    // Manual Tutor Review is required as per the new workflow.

    return NextResponse.json({ 
      success: true, 
      message: 'Attempt recorded successfully',
      attemptId: attempt.id 
    }, { status: 201 })

  } catch (e) {
    return handleRouteError(e)
  }
}
