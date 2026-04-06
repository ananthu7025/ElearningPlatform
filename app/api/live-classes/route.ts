import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { requireFeature } from '@/lib/planGate'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const createSchema = z.object({
  title:       z.string().min(3, 'Required'),
  courseId:    z.string().uuid(),
  scheduledAt: z.string().datetime(),
  duration:    z.coerce.number().int().positive().default(60),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN', 'STUDENT')
    const instituteId = user.instituteId!

    const upcoming = req.nextUrl.searchParams.get('upcoming') === 'true'
    const where: any = { course: { instituteId } }

    if (user.role === 'TUTOR') where.course = { ...where.course, tutorId: user.userId }
    if (upcoming) where.scheduledAt = { gt: new Date() }

    const liveClasses = await prisma.liveClass.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        tutor:  { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    })

    return NextResponse.json({ liveClasses })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')
    await requireFeature(user.instituteId!, 'live_classes')

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const course = await prisma.course.findFirst({
      where: { id: parsed.data.courseId, instituteId: user.instituteId! },
    })
    if (!course) return errorResponse('NOT_FOUND', 'Course not found', 404)

    const liveClass = await prisma.liveClass.create({
      data: {
        title:          parsed.data.title,
        courseId:       parsed.data.courseId,
        instituteId:    user.instituteId!,
        tutorId:        user.userId,
        scheduledAt:    new Date(parsed.data.scheduledAt),
        durationMinutes: parsed.data.duration,
        agoraChannelId: `lc_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      },
    })

    return NextResponse.json({ liveClass }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
