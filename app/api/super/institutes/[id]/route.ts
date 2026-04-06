import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  name:    z.string().min(2).optional(),
  planId:  z.string().uuid().optional(),
  status:  z.enum(['ACTIVE', 'TRIAL', 'SUSPENDED']).optional(),
  phone:   z.string().optional(),
  region:  z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole('SUPER_ADMIN')

    const institute = await prisma.institute.findUnique({
      where: { id: params.id },
      include: {
        plan: { select: { id: true, name: true, priceMonthly: true, maxStudents: true } },
        users: { where: { role: 'ADMIN' }, select: { name: true, email: true }, take: 1 },
        _count: { select: { users: { where: { role: 'STUDENT' } } } },
      },
    })

    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found', 404)

    const revenueRow = await prisma.subscriptionPayment.aggregate({
      where: { instituteId: params.id, status: 'CAPTURED' },
      _sum: { amount: true },
    })

    return NextResponse.json({
      institute: {
        ...institute,
        adminName:  institute.users[0]?.name  ?? '—',
        adminEmail: institute.users[0]?.email ?? '—',
        revenue:    Number(revenueRow._sum.amount ?? 0),
        users:      undefined,
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole('SUPER_ADMIN')

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const institute = await prisma.institute.update({
      where: { id: params.id },
      data: parsed.data,
      include: { plan: true },
    })

    return NextResponse.json({ institute })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole('SUPER_ADMIN')

    const { id } = params

    const existing = await prisma.institute.findUnique({ where: { id } })
    if (!existing) return errorResponse('NOT_FOUND', 'Institute not found', 404)

    await prisma.$transaction(async (tx) => {
      // Gather child IDs needed for deep deletes
      const userIds = (await tx.user.findMany({
        where: { instituteId: id }, select: { id: true },
      })).map((u) => u.id)

      const courseIds = (await tx.course.findMany({
        where: { instituteId: id }, select: { id: true },
      })).map((c) => c.id)

      const scenarioIds = (await tx.practiceScenario.findMany({
        where: { instituteId: id }, select: { id: true },
      })).map((s) => s.id)

      const enrollmentIds = (await tx.enrollment.findMany({
        where: { courseId: { in: courseIds } }, select: { id: true },
      })).map((e) => e.id)

      // ── Leaf records first ────────────────────────────────────────────────
      await tx.quizAttempt.deleteMany({ where: { studentId: { in: userIds } } })
      await tx.assignmentSubmission.deleteMany({ where: { studentId: { in: userIds } } })
      await tx.practiceSubmission.deleteMany({ where: { scenarioId: { in: scenarioIds } } })
      // LessonProgress cascades from Enrollment, but delete enrollment explicitly
      await tx.lessonProgress.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } })
      await tx.enrollment.deleteMany({ where: { id: { in: enrollmentIds } } })
      await tx.payment.deleteMany({ where: { studentId: { in: userIds } } })
      await tx.doubt.deleteMany({ where: { courseId: { in: courseIds } } })

      // ── Institute-level records ───────────────────────────────────────────
      await tx.subscriptionPayment.deleteMany({ where: { instituteId: id } })
      await tx.liveClass.deleteMany({ where: { instituteId: id } })
      await tx.announcement.deleteMany({ where: { instituteId: id } })
      await tx.practiceScenario.deleteMany({ where: { instituteId: id } })

      // Courses cascade → Module → Lesson → Quiz/QuizQuestion/Assignment
      await tx.course.deleteMany({ where: { instituteId: id } })

      // Coupons after payments are gone
      await tx.coupon.deleteMany({ where: { instituteId: id } })

      // Users — Notification cascades via onDelete: Cascade on User
      await tx.user.deleteMany({ where: { instituteId: id } })

      // Finally the institute itself
      await tx.institute.delete({ where: { id } })
    })

    return NextResponse.json({ message: 'Institute permanently deleted' })
  } catch (e) {
    return handleRouteError(e)
  }
}
