import { certificateQueue, emailQueue, embedQueue } from '@/worker/queues'
import type { CertificateJobData, EmailJobData, EmbedJobData } from '@/worker/queues'

export async function enqueueCertificate(data: CertificateJobData) {
  await certificateQueue.add('generate', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
}

export async function enqueueEmail(data: EmailJobData) {
  await emailQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
}

export async function enqueueEmbed(data: EmbedJobData) {
  await embedQueue.add('embed', data, { attempts: 2 })
}
