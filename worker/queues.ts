import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) }

export const certificateQueue = new Queue('certificate', { connection })
export const emailQueue       = new Queue('email',       { connection })
export const embedQueue       = new Queue('embed',       { connection })

// Job payload types
export interface CertificateJobData {
  enrollmentId: string
  userId:       string
  courseId:     string
}

export interface EmailJobData {
  type:    'enrollment_confirm' | 'assignment_graded' | 'doubt_answered' | 'live_reminder' | 'certificate_issued'
  to:      string
  name:    string
  payload: Record<string, any>
}

export interface EmbedJobData {
  lessonId: string
  content:  string
}
