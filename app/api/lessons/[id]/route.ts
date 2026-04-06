import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  title:      z.string().min(1).optional(),
  muxAssetId: z.string().optional().nullable(),
  muxPlaybackId: z.string().optional().nullable(),
  pdfKey:     z.string().optional().nullable(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  isFreePreview:   z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.id, module: { course: { instituteId: user.instituteId! } } },
      include: { module: { select: { courseId: true } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)

    // Students must be enrolled
    if (user.role === 'STUDENT' && !lesson.isFreePreview) {
      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId: user.userId, courseId: lesson.module.courseId },
      })
      if (!enrolled) return errorResponse('FORBIDDEN', 'Not enrolled', 403)
    }

    return NextResponse.json({ lesson })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.id, module: { course: { instituteId: user.instituteId! } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const updated = await prisma.lesson.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json({ lesson: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR')

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.id, module: { course: { instituteId: user.instituteId! } } },
    })
    if (!lesson) return errorResponse('NOT_FOUND', 'Lesson not found', 404)

    await prisma.lesson.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
