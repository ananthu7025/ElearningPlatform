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

export async function sendStudentInviteEmail(opts: {
  to:           string
  name:         string
  tempPassword: string
  instituteName: string
  loginUrl?:    string
}): Promise<void> {
  const url = opts.loginUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login`

  await sendEmail({
    to:      opts.to,
    subject: `You've been invited to ${opts.instituteName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
        <h2 style="margin-top:0">Welcome, ${opts.name}!</h2>
        <p>You have been enrolled as a <strong>Student</strong> at <strong>${opts.instituteName}</strong>. Use the credentials below to log in and start learning.</p>
        <table style="margin:24px 0;border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:4px 0 0 4px;font-weight:600;white-space:nowrap">Email</td>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:0 4px 4px 0">${opts.to}</td>
          </tr>
          <tr><td colspan="2" style="height:6px"></td></tr>
          <tr>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:4px 0 0 4px;font-weight:600;white-space:nowrap">Temporary Password</td>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:0 4px 4px 0;font-family:monospace;letter-spacing:1px">${opts.tempPassword}</td>
          </tr>
        </table>
        <p>Please change your password after your first login.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#696cff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Start Learning</a>
        <p style="margin-top:32px;font-size:12px;color:#888">If you did not expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
  })
}

export async function sendTutorInviteEmail(opts: {
  to: string
  name: string
  tempPassword: string
}): Promise<void> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login`

  await sendEmail({
    to:      opts.to,
    subject: 'You have been invited as a Tutor',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
        <h2 style="margin-top:0">Welcome, ${opts.name}!</h2>
        <p>You have been invited to join as a <strong>Tutor</strong>. Use the credentials below to log in and set up your account.</p>
        <table style="margin:24px 0;border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:4px 0 0 4px;font-weight:600;white-space:nowrap">Email</td>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:0 4px 4px 0">${opts.to}</td>
          </tr>
          <tr><td colspan="2" style="height:6px"></td></tr>
          <tr>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:4px 0 0 4px;font-weight:600;white-space:nowrap">Temporary Password</td>
            <td style="padding:8px 12px;background:#f4f5f7;border-radius:0 4px 4px 0;font-family:monospace;letter-spacing:1px">${opts.tempPassword}</td>
          </tr>
        </table>
        <p>Please change your password after your first login.</p>
        <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#696cff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Log In Now</a>
        <p style="margin-top:32px;font-size:12px;color:#888">If you did not expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
  })
}
