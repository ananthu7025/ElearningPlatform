import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { sendAnnouncementEmails } from '@/lib/sendAnnouncementEmails'
import { z } from 'zod'

const createSchema = z.object({
  title:          z.string().min(2, 'Required'),
  body:           z.string().min(1, 'Required'),
  targetRole:     z.enum(['STUDENT', 'TUTOR']).nullable().optional(),
  targetCourseId: z.string().nullable().optional(),
  channels:       z.array(z.enum(['EMAIL', 'APP'])).min(1, 'Select at least one channel'),
  status:         z.enum(['DRAFT', 'SCHEDULED', 'SENT']).default('DRAFT'),
  scheduledAt:    z.string().datetime().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? ''
    const search = searchParams.get('search') ?? ''
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit  = Math.min(100, Number(searchParams.get('limit') ?? 20))

    const where = {
      instituteId,
      ...(status ? { status: status as any } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const [announcements, total, sentCount, scheduledCount, totalReach] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          targetCourse: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.announcement.count({ where }),
      prisma.announcement.count({
        where: { instituteId, status: 'SENT', createdAt: { gte: thisMonthStart } },
      }),
      prisma.announcement.count({ where: { instituteId, status: 'SCHEDULED' } }),
      prisma.announcement.aggregate({
        where: { instituteId, status: 'SENT', createdAt: { gte: thisMonthStart } },
        _sum: { notifiedCount: true },
      }),
    ])

    return NextResponse.json({
      announcements,
      total,
      page,
      limit,
      stats: {
        sentThisMonth: sentCount,
        totalReach:    Number(totalReach._sum.notifiedCount ?? 0),
        scheduled:     scheduledCount,
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const d = parsed.data

    // Compute reach for SENT announcements
    let notifiedCount = 0
    if (d.status === 'SENT') {
      if (d.targetCourseId) {
        notifiedCount = await prisma.enrollment.count({ where: { courseId: d.targetCourseId } })
      } else {
        notifiedCount = await prisma.user.count({
          where: {
            instituteId,
            role: d.targetRole ?? 'STUDENT',
            isActive: true,
          },
        })
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        instituteId,
        authorId:       user.userId,
        title:          d.title,
        body:           d.body,
        targetRole:     d.targetRole ?? 'STUDENT',
        targetCourseId: d.targetCourseId ?? null,
        channels:       d.channels,
        status:         d.status,
        scheduledAt:    d.scheduledAt ? new Date(d.scheduledAt) : null,
        notifiedCount,
      },
      include: { targetCourse: { select: { id: true, title: true } } },
    })

    if (d.status === 'SENT') {
      // Fetch target users once for both channels
      const targetUsers = d.targetCourseId
        ? await prisma.enrollment.findMany({
            where:  { courseId: d.targetCourseId },
            select: { student: { select: { id: true, email: true } } },
          }).then((e) => e.map((x) => x.student))
        : await prisma.user.findMany({
            where:  { instituteId, role: d.targetRole ?? 'STUDENT', isActive: true },
            select: { id: true, email: true },
          })

      // In-app notifications
      if (d.channels.includes('APP') && targetUsers.length > 0) {
        await prisma.notification.createMany({
          data: targetUsers.map(({ id: userId }) => ({
            userId,
            type:  'ANNOUNCEMENT' as const,
            title: d.title,
            body:  d.body.slice(0, 200),
          })),
          skipDuplicates: true,
        })
      }

      // Email notifications (fire-and-forget — failure won't break response)
      if (d.channels.includes('EMAIL') && targetUsers.length > 0) {
        sendAnnouncementEmails({
          title:  d.title,
          body:   d.body,
          emails: targetUsers.map((u) => u.email),
        }).catch((err) => console.error('[announcement] email batch failed:', err))
      }
    }

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
