import { prisma } from './prisma'
import { FeatureKey } from './planFeatures'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanLimits {
  maxStudents: number
  maxCourses:  number
  maxTutors:   number
  features:    string[]
}

export interface LimitCheck {
  allowed: boolean
  current: number
  max:     number
  message: string
}

// ── Internal: load plan for an institute ──────────────────────────────────────

async function getInstituePlan(instituteId: string): Promise<PlanLimits | null> {
  const inst = await prisma.institute.findUnique({
    where:  { id: instituteId },
    select: {
      plan: {
        select: { maxStudents: true, maxCourses: true, maxTutors: true, features: true },
      },
    },
  })
  if (!inst) return null
  return {
    maxStudents: inst.plan.maxStudents,
    maxCourses:  inst.plan.maxCourses,
    maxTutors:   inst.plan.maxTutors,
    features:    inst.plan.features as string[],
  }
}

// ── Feature gate ──────────────────────────────────────────────────────────────

/**
 * Returns true if the institute's plan includes the given feature key.
 */
export async function hasFeature(instituteId: string, feature: FeatureKey): Promise<boolean> {
  const plan = await getInstituePlan(instituteId)
  if (!plan) return false
  return plan.features.includes(feature)
}

/**
 * Throws a 403-style error string if the feature is not on the plan.
 * Use with errorResponse('PLAN_LIMIT', ..., 403) in route handlers.
 */
export async function requireFeature(instituteId: string, feature: FeatureKey): Promise<void> {
  const ok = await hasFeature(instituteId, feature)
  if (!ok) throw new Error(`FEATURE_LOCKED:${feature}`)
}

// ── Hard-limit checks ─────────────────────────────────────────────────────────

export async function checkStudentLimit(instituteId: string): Promise<LimitCheck> {
  const plan = await getInstituePlan(instituteId)
  if (!plan) return { allowed: false, current: 0, max: 0, message: 'Institute not found' }

  const current = await prisma.user.count({ where: { instituteId, role: 'STUDENT' } })
  const allowed = current < plan.maxStudents
  return {
    allowed,
    current,
    max:     plan.maxStudents,
    message: allowed
      ? ''
      : `Student limit reached (${current}/${plan.maxStudents}). Upgrade your plan to add more students.`,
  }
}

export async function checkCourseLimit(instituteId: string): Promise<LimitCheck> {
  const plan = await getInstituePlan(instituteId)
  if (!plan) return { allowed: false, current: 0, max: 0, message: 'Institute not found' }

  const current = await prisma.course.count({ where: { instituteId } })
  const allowed = current < plan.maxCourses
  return {
    allowed,
    current,
    max:     plan.maxCourses,
    message: allowed
      ? ''
      : `Course limit reached (${current}/${plan.maxCourses}). Upgrade your plan to create more courses.`,
  }
}

export async function checkTutorLimit(instituteId: string): Promise<LimitCheck> {
  const plan = await getInstituePlan(instituteId)
  if (!plan) return { allowed: false, current: 0, max: 0, message: 'Institute not found' }

  const current = await prisma.user.count({ where: { instituteId, role: 'TUTOR' } })
  const allowed = current < plan.maxTutors
  return {
    allowed,
    current,
    max:     plan.maxTutors,
    message: allowed
      ? ''
      : `Tutor limit reached (${current}/${plan.maxTutors}). Upgrade your plan to add more tutors.`,
  }
}
