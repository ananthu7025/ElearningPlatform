import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.FROM_EMAIL ?? 'noreply@lexed.in'

interface SendEmailOptions {
  to:      string | string[]
  subject: string
  html:    string
  replyTo?: string
}

/**
 * Central email send function. All templates call this.
 * In development, logs to console instead of sending if RESEND_API_KEY is a placeholder.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development'
  const isPlaceholder = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_xxx'

  if (isDev && isPlaceholder) {
    console.log('\n📧 [EMAIL — DEV MODE]')
    console.log('  To:     ', Array.isArray(opts.to) ? opts.to.join(', ') : opts.to)
    console.log('  Subject:', opts.subject)
    console.log('  (HTML body suppressed — set RESEND_API_KEY to send real emails)\n')
    return
  }

  const { error } = await resend.emails.send({
    from:     FROM,
    to:       opts.to,
    subject:  opts.subject,
    html:     opts.html,
    replyTo:  opts.replyTo,
  })

  if (error) {
    // Log but don't throw — email failure should not break the main flow
    console.error('[email] Failed to send:', error)
  }
}
