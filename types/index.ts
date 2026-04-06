// ─── Shared enums ────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TUTOR' | 'STUDENT'
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type LessonType = 'VIDEO' | 'PDF' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE'
export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED'
export type InstituteStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED'

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl: string | null
  instituteId: string | null
  isActive: boolean
  createdAt: string
}

export interface Institute {
  id: string
  name: string
  subdomain: string
  logoUrl: string | null
  primaryColor: string
  status: InstituteStatus
  plan: Plan
  trialEndsAt: string | null
  createdAt: string
}

export interface Plan {
  id: string
  name: string
  maxStudents: number
  maxCourses: number
  maxTutors: number
  priceMonthly: number
  features: string[]
  isActive: boolean
}

export interface Course {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  price: number
  category: string
  status: CourseStatus
  totalDuration: number | null
  tutor: Pick<User, 'id' | 'name' | 'avatarUrl'>
  enrolledCount?: number
  isEnrolled?: boolean
  createdAt: string
}

export interface Module {
  id: string
  title: string
  orderIndex: number
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  type: LessonType
  durationSeconds: number | null
  orderIndex: number
  isFreePreview: boolean
  isCompleted?: boolean
  muxPlaybackId?: string | null
}

export interface Enrollment {
  courseId: string
  courseTitle: string
  thumbnailUrl: string | null
  completionPercentage: number
  lastAccessedAt: string | null
  isCertified: boolean
  totalLessons: number
  completedLessons: number
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: string
}
