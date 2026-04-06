import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const createSchema = z.object({
  title:   z.string().min(3, 'Required'),
  content: z.string().min(10, 'Required'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR', 'STUDENT')
    const instituteId = user.instituteId!

    const announcements = await prisma.announcement.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ announcements })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const announcement = await prisma.announcement.create({
      data: {
        title: parsed.data.title,
        body:  parsed.data.content,
        instituteId,
        authorId: user.userId,
      },
    })

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
