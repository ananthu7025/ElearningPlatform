import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const questionSchema = z.object({
  questionText:  z.string().min(1, 'Question text required'),
  questionType:  z.enum(['mcq', 'tf', 'short']).default('mcq'),
  options:       z.array(z.string()).optional(),   // MCQ options array
  correctAnswer: z.string(),   // empty string allowed for 'short' type
  explanation:   z.string().optional(),
  orderIndex:    z.number().int().nonnegative(),
})

const quizSchema = z.object({
  title:            z.string().min(1, 'Required'),
  passingScore:     z.number().int().min(0).max(100).default(60),
  timeLimitMinutes: z.number().int().positive().optional(),
  questions:        z.array(questionSchema).min(1, 'Add at least one question'),
})

type QuizPayload = z.infer<typeof quizSchema>

// ── GET — fetch quiz + questions ──────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR', 'STUDENT')

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.id, module: { course: { instituteId: user.instituteId! } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)

    const quiz = await prisma.quiz.findUnique({
      where:   { lessonId: params.id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    })

    if (!quiz) return NextResponse.json({ quiz: null })
    return NextResponse.json({ quiz })
  } catch (e) {
    return handleRouteError(e)
  }
}

// ── POST — create quiz + questions ────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.id, module: { course: { instituteId: user.instituteId! } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)
    if (lesson.type !== 'QUIZ') return errorResponse('VALIDATION', 'Lesson must be of type QUIZ', 422)

    const existing = await prisma.quiz.findUnique({ where: { lessonId: params.id } })
    if (existing) return errorResponse('CONFLICT', 'Quiz already exists for this lesson. Use PUT to update.', 409)

    const body = await req.json()
    const parsed = quizSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const quiz = await prisma.quiz.create({
      data: {
        lessonId:         params.id,
        title:            parsed.data.title,
        passingScore:     parsed.data.passingScore,
        timeLimitMinutes: parsed.data.timeLimitMinutes,
        questions: {
          create: parsed.data.questions.map((q) => ({
            questionText:  q.questionText,
            questionType:  q.questionType,
            options:       q.options ?? [],
            correctAnswer: q.correctAnswer,
            explanation:   q.explanation ?? '',
            orderIndex:    q.orderIndex,
          })),
        },
      },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}

// ── PUT — replace quiz settings + all questions ──────────────────────────────���
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.id, module: { course: { instituteId: user.instituteId! } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)

    const body = await req.json()
    const parsed = quizSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const quiz = await prisma.$transaction(async (tx) => {
      // Upsert the quiz record
      const upserted = await tx.quiz.upsert({
        where:  { lessonId: params.id },
        create: {
          lessonId:         params.id,
          title:            parsed.data.title,
          passingScore:     parsed.data.passingScore,
          timeLimitMinutes: parsed.data.timeLimitMinutes,
        },
        update: {
          title:            parsed.data.title,
          passingScore:     parsed.data.passingScore,
          timeLimitMinutes: parsed.data.timeLimitMinutes,
        },
      })

      // Replace all questions
      await tx.quizQuestion.deleteMany({ where: { quizId: upserted.id } })
      await tx.quizQuestion.createMany({
        data: parsed.data.questions.map((q) => ({
          quizId:        upserted.id,
          questionText:  q.questionText,
          questionType:  q.questionType,
          options:       q.options ?? [],
          correctAnswer: q.correctAnswer,
          explanation:   q.explanation ?? '',
          orderIndex:    q.orderIndex,
        })),
      })

      return tx.quiz.findUnique({
        where:   { id: upserted.id },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      })
    })

    return NextResponse.json({ quiz })
  } catch (e) {
    return handleRouteError(e)
  }
}
