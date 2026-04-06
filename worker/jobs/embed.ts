import { Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import type { EmbedJobData } from '../queues'

// Sends lesson content to Python AI service for embedding + pgvector storage
export async function processEmbed(job: Job<EmbedJobData>) {
  const { lessonId, content } = job.data

  const res = await fetch(`${process.env.AI_SERVICE_URL}/embed`, {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'x-internal-key': process.env.AI_INTERNAL_SECRET ?? '',
    },
    body: JSON.stringify({ lessonId, content }),
  })

  if (!res.ok) {
    throw new Error(`Embed service error: ${res.status}`)
  }

  console.log(`Embedded lesson: ${lessonId}`)
}
