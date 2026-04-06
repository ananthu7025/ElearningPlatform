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

    const baseWhere = { course: { instituteId } }

    const [enrolled, started, half, mostly, complete, certified] = await Promise.all([
      prisma.enrollment.count({ where: baseWhere }),
      prisma.enrollment.count({ where: { ...baseWhere, completionPercentage: { gt: 0 } } }),
      prisma.enrollment.count({ where: { ...baseWhere, completionPercentage: { gte: 50 } } }),
      prisma.enrollment.count({ where: { ...baseWhere, completionPercentage: { gte: 80 } } }),
      prisma.enrollment.count({ where: { ...baseWhere, completionPercentage: 100 } }),
      prisma.enrollment.count({ where: { ...baseWhere, isCertified: true } }),
    ])

    const funnel = [
      { stage: 'Enrolled',           count: enrolled,  color: 'primary' },
      { stage: 'Started (>0%)',       count: started,   color: 'info'    },
      { stage: '50%+ complete',       count: half,      color: 'success' },
      { stage: '80%+ complete',       count: mostly,    color: 'warning' },
      { stage: '100% complete',       count: complete,  color: 'danger'  },
      { stage: 'Certificate earned',  count: certified, color: 'secondary'},
    ].map((f) => ({
      ...f,
      pct: enrolled > 0 ? Math.round((f.count / enrolled) * 100) : 0,
    }))

    // Top courses by completion rate
    const courses = await prisma.course.findMany({
      where: { instituteId, status: 'PUBLISHED' },
      select: {
        id: true, title: true,
        enrollments: { select: { completionPercentage: true } },
      },
    })
    const courseStats = courses.map((c) => {
      const total    = c.enrollments.length
      const complete = c.enrollments.filter((e) => e.completionPercentage === 100).length
      return {
        title:      c.title,
        enrolled:   total,
        completed:  complete,
        completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
      }
    }).sort((a, b) => b.completionRate - a.completionRate).slice(0, 5)

    return NextResponse.json({ funnel, courseStats })
  } catch (e) {
    return handleRouteError(e)
  }
}
