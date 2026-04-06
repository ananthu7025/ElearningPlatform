import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const submitSchema = z.object({
  content: z.string().optional(),
  fileUrl: z.string().url().optional(),
}).refine((d) => d.content || d.fileUrl, { message: 'Provide content or file' })

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const assignment = await prisma.assignment.findFirst({
      where: { id: params.id, lesson: { module: { course: { instituteId: user.instituteId! } } } },
    })
    if (!assignment) return errorResponse('NOT_FOUND', 'Assignment not found', 404)

    const submissions = await prisma.assignmentSubmission.findMany({
      where:   { assignmentId: params.id },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json({ submissions, assignment })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('STUDENT')

    const assignment = await prisma.assignment.findFirst({
      where: { id: params.id, lesson: { module: { course: { instituteId: user.instituteId! } } } },
    })
    if (!assignment) return errorResponse('NOT_FOUND', 'Assignment not found', 404)

    const body = await req.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const existing = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: params.id, studentId: user.userId },
    })
    if (existing) return errorResponse('CONFLICT', 'Already submitted', 409)

    const submission = await prisma.assignmentSubmission.create({
      data: { assignmentId: params.id, studentId: user.userId, ...parsed.data },
    })

    return NextResponse.json({ submission }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
