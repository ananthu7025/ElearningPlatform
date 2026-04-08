import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { checkCourseLimit } from '@/lib/planGate'
import { z } from 'zod'

const createSchema = z.object({
  title:        z.string().min(3, 'Required'),
  description:  z.string().optional(),
  category:     z.string().min(1, 'Required'),
  price:        z.coerce.number().nonnegative().default(0),
  tutorId:      z.string().uuid().optional(),
  thumbnailUrl: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN', 'TUTOR', 'STUDENT')
    const instituteId = user.instituteId!

    const { searchParams } = new URL(req.url)
    const status    = searchParams.get('status') ?? undefined
    const search    = searchParams.get('search') ?? undefined
    const category  = searchParams.get('category') ?? undefined
    const page      = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit     = Math.min(50, Number(searchParams.get('limit') ?? 20))

    const where = {
      instituteId,
      ...(status ? { status: status as any } : {}),
      ...(category ? { category } : {}),
      ...(user.role === 'TUTOR' ? { tutorId: user.userId } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          tutor:  { select: { id: true, name: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.course.count({ where }),
    ])

    return NextResponse.json({ courses, total, page, limit })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const limit = await checkCourseLimit(instituteId)
    if (!limit.allowed) return errorResponse('PLAN_LIMIT', limit.message, 403)

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const course = await prisma.course.create({
      data: {
        title:        parsed.data.title,
        description:  parsed.data.description ?? '',
        category:     parsed.data.category,
        price:        parsed.data.price,
        tutorId:      parsed.data.tutorId || user.userId,
        instituteId,
        status:       'DRAFT',
        thumbnailUrl: parsed.data.thumbnailUrl,
      },
    })

    return NextResponse.json({ course }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
