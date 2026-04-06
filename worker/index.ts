import { Worker } from 'bullmq'
import { processCertificate } from './jobs/certificate'
import { processEmail }       from './jobs/email'
import { processEmbed }       from './jobs/embed'

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
}

// ── Certificate worker ─────────────────────────────────────────────────────
new Worker('certificate', processCertificate, { connection, concurrency: 2 })

// ── Email worker ───────────────────────────────────────────────────────────
new Worker('email', processEmail, { connection, concurrency: 5 })

// ── Embed worker ───────────────────────────────────────────────────────────
new Worker('embed', processEmbed, { connection, concurrency: 1 })

console.log('✓ Workers running — certificate | email | embed')
