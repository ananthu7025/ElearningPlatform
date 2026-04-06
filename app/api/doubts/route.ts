import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const createSchema = z.object({
  lessonId: z.string().uuid(),
  question: z.string().min(10, 'Please describe your doubt'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('TUTOR', 'STUDENT', 'ADMIN')

    const { searchParams } = new URL(req.url)
    const resolved = searchParams.get('resolved') === 'true'

    let where: any = { lesson: { module: { course: { instituteId: user.instituteId! } } } }

    if (user.role === 'TUTOR') {
      where = { ...where, lesson: { module: { course: { tutorId: user.userId, instituteId: user.instituteId! } } } }
    } else if (user.role === 'STUDENT') {
      where = { ...where, studentId: user.userId }
    }

    where.isResolved = resolved

    const doubts = await prisma.doubt.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
        lesson:  { select: { id: true, title: true, module: { select: { course: { select: { title: true } } } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    return NextResponse.json({ doubts })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT')

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const lesson = await prisma.lesson.findUnique({
      where:   { id: parsed.data.lessonId },
      include: { module: { select: { courseId: true } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)

    const doubt = await prisma.doubt.create({
      data: { 
        lessonId:  parsed.data.lessonId,
        question:  parsed.data.question,
        courseId:  lesson.module.courseId,
        studentId: user.userId 
      },
    })

    return NextResponse.json({ doubt }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
