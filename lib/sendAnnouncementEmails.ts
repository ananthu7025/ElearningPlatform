import { sendEmail } from '@/lib/email'

export async function sendAnnouncementEmails(opts: {
  title:  string
  body:   string
  emails: string[]
}) {
  if (opts.emails.length === 0) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const CHUNK  = 50
  for (let i = 0; i < opts.emails.length; i += CHUNK) {
    const chunk = opts.emails.slice(i, i + CHUNK)
    await Promise.allSettled(
      chunk.map((to) =>
        sendEmail({
          to,
          subject: opts.title,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
              <h2 style="margin-top:0;color:#7367F0">${opts.title}</h2>
              <p style="white-space:pre-wrap;line-height:1.7">${opts.body}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
              <p style="font-size:12px;color:#888">
                You received this because you are enrolled at this institute.
                <a href="${appUrl}" style="color:#7367F0">Visit your dashboard</a>
              </p>
            </div>
          `,
        }),
      ),
    )
  }
}
