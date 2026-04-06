import { Job } from 'bullmq'
import { Resend } from 'resend'
import type { EmailJobData } from '../queues'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'LexEd <noreply@lexed.in>'

const TEMPLATES: Record<EmailJobData['type'], (payload: Record<string, any>, name: string) => { subject: string; html: string }> = {
  enrollment_confirm: (p, name) => ({
    subject: `You're enrolled in ${p.courseTitle}`,
    html: `<h2>Welcome, ${name}!</h2><p>You're now enrolled in <strong>${p.courseTitle}</strong>. Start learning at <a href="${p.courseUrl}">LexEd</a>.</p>`,
  }),
  assignment_graded: (p, name) => ({
    subject: `Assignment graded — ${p.courseTitle}`,
    html: `<h2>Hi ${name},</h2><p>Your assignment for <strong>${p.courseTitle}</strong> has been graded. Score: <strong>${p.score}</strong>.<br/>${p.feedback ? `<br/>Feedback: ${p.feedback}` : ''}</p>`,
  }),
  doubt_answered: (p, name) => ({
    subject: 'Your doubt has been answered',
    html: `<h2>Hi ${name},</h2><p>Your question "<em>${p.question}</em>" has been answered by your tutor. <a href="${p.courseUrl}">View answer</a>.</p>`,
  }),
  live_reminder: (p, name) => ({
    subject: `Live class starting in 30 minutes — ${p.title}`,
    html: `<h2>Hi ${name},</h2><p>Reminder: <strong>${p.title}</strong> starts in 30 minutes. <a href="${p.joinUrl}">Join class</a>.</p>`,
  }),
  certificate_issued: (p, name) => ({
    subject: `Your certificate is ready — ${p.courseTitle}`,
    html: `<h2>Congratulations, ${name}!</h2><p>You've completed <strong>${p.courseTitle}</strong>. <a href="${p.downloadUrl}">Download your certificate</a>.</p>`,
  }),
}

export async function processEmail(job: Job<EmailJobData>) {
  const { type, to, name, payload } = job.data
  const template = TEMPLATES[type](payload, name)

  await resend.emails.send({
    from:    FROM,
    to,
    subject: template.subject,
    html:    template.html,
  })

  console.log(`Email sent: ${type} → ${to}`)
}
