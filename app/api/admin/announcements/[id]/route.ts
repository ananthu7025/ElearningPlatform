import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { sendAnnouncementEmails } from '@/lib/sendAnnouncementEmails'
import { z } from 'zod'

const patchSchema = z.object({
  action: z.enum(['send', 'schedule']).optional(),
  title:          z.string().min(2).optional(),
  body:           z.string().min(1).optional(),
  targetRole:     z.enum(['STUDENT', 'TUTOR']).nullable().optional(),
  targetCourseId: z.string().nullable().optional(),
  channels:       z.array(z.enum(['EMAIL', 'APP'])).optional(),
  scheduledAt:    z.string().datetime().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const ann = await prisma.announcement.findFirst({
      where: { id: params.id, instituteId },
    })
    if (!ann) return errorResponse('NOT_FOUND', 'Announcement not found', 404)
    if (ann.status === 'SENT') return errorResponse('CONFLICT', 'Cannot edit a sent announcement', 409)

    const body   = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const d = parsed.data

    let newStatus: 'DRAFT' | 'SCHEDULED' | 'SENT' = ann.status
    let notifiedCount = ann.notifiedCount

    if (d.action === 'send') {
      newStatus = 'SENT'
      const targetCourseId = d.targetCourseId ?? ann.targetCourseId
      const targetRole     = d.targetRole     ?? ann.targetRole

      if (targetCourseId) {
        notifiedCount = await prisma.enrollment.count({ where: { courseId: targetCourseId } })
      } else {
        notifiedCount = await prisma.user.count({
          where: { instituteId, role: targetRole ?? 'STUDENT', isActive: true },
        })
      }

      const channels: string[] = (d.channels as string[] | undefined) ?? (ann.channels as string[])
      const title = d.title ?? ann.title
      const body  = d.body  ?? ann.body

      // Fetch target users once for both channels
      const targetUsers = targetCourseId
        ? await prisma.enrollment.findMany({
            where:  { courseId: targetCourseId },
            select: { student: { select: { id: true, email: true } } },
          }).then((e) => e.map((x) => x.student))
        : await prisma.user.findMany({
            where:  { instituteId, role: targetRole ?? 'STUDENT', isActive: true },
            select: { id: true, email: true },
          })

      if (channels.includes('APP') && targetUsers.length > 0) {
        await prisma.notification.createMany({
          data: targetUsers.map(({ id: userId }) => ({
            userId,
            type:  'ANNOUNCEMENT' as const,
            title,
            body:  body.slice(0, 200),
          })),
          skipDuplicates: true,
        })
      }

      if (channels.includes('EMAIL') && targetUsers.length > 0) {
        sendAnnouncementEmails({
          title,
          body,
          emails: targetUsers.map((u) => u.email),
        }).catch((err) => console.error('[announcement] email batch failed:', err))
      }
    } else if (d.action === 'schedule') {
      newStatus = 'SCHEDULED'
    }

    const updated = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        ...(d.title          !== undefined ? { title:          d.title }                      : {}),
        ...(d.body           !== undefined ? { body:           d.body }                       : {}),
        ...(d.targetRole     !== undefined ? { targetRole:     d.targetRole }                 : {}),
        ...(d.targetCourseId !== undefined ? { targetCourseId: d.targetCourseId }             : {}),
        ...(d.channels       !== undefined ? { channels:       d.channels }                   : {}),
        ...(d.scheduledAt    !== undefined ? { scheduledAt:    d.scheduledAt ? new Date(d.scheduledAt) : null } : {}),
        status:        newStatus,
        notifiedCount,
      },
      include: { targetCourse: { select: { id: true, title: true } } },
    })

    return NextResponse.json({ announcement: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const ann = await prisma.announcement.findFirst({
      where: { id: params.id, instituteId },
    })
    if (!ann) return errorResponse('NOT_FOUND', 'Announcement not found', 404)

    await prisma.announcement.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
