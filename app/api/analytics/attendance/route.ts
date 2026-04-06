import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'
import { requireFeature } from '@/lib/planGate'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!
    await requireFeature(instituteId, 'advanced_analytics')
    await requireFeature(instituteId, 'live_classes')

    const [totalClasses, scheduled, completed, cancelled, recentClasses] = await Promise.all([
      prisma.liveClass.count({ where: { instituteId } }),
      prisma.liveClass.count({ where: { instituteId, status: 'scheduled' } }),
      prisma.liveClass.count({ where: { instituteId, status: 'completed' } }),
      prisma.liveClass.count({ where: { instituteId, status: 'cancelled' } }),
      prisma.liveClass.findMany({
        where:   { instituteId },
        include: {
          course: { select: { id: true, title: true, enrollments: { select: { studentId: true } } } },
          tutor:  { select: { name: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      }),
    ])

    const classes = recentClasses.map((lc) => ({
      id:             lc.id,
      title:          lc.title,
      courseTitle:    lc.course.title,
      tutorName:      lc.tutor.name,
      scheduledAt:    lc.scheduledAt,
      durationMinutes: lc.durationMinutes,
      status:         lc.status,
      enrolledCount:  lc.course.enrollments.length,
    }))

    return NextResponse.json({
      stats: { totalClasses, scheduled, completed, cancelled },
      classes,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
