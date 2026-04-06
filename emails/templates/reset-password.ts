import { baseLayout, colors } from '../base'

interface ResetPasswordParams {
  userName:  string
  resetUrl:  string
  expiresIn: string   // human readable e.g. "1 hour"
}

export function resetPasswordEmail(params: ResetPasswordParams): { subject: string; html: string } {
  const { userName, resetUrl, expiresIn } = params

  const content = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:14px;background:rgba(115,103,240,0.12);">
        <span style="font-size:28px;">🔐</span>
      </div>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${colors.TEXT_HEAD};text-align:center;">
      Reset Your Password
    </h1>
    <p style="margin:0 0 28px;font-size:15px;color:${colors.TEXT_MAIN};text-align:center;line-height:1.6;">
      Hi ${userName}, we received a request to reset your LexEd password.<br/>
      Click the button below to choose a new one.
    </p>

    <!-- CTA button -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}"
        style="display:inline-block;padding:14px 40px;background:${colors.PRIMARY};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
        Reset My Password
      </a>
    </div>

    <!-- Expiry warning -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="border-left:3px solid #FF9F43;background:rgba(255,159,67,0.07);border-radius:0 8px 8px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;color:${colors.TEXT_MAIN};line-height:1.6;">
          ⏱️ This link expires in <strong>${expiresIn}</strong>. After that you'll need to request a new one.
        </td>
      </tr>
    </table>

    <!-- Didn't request note -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="border-left:3px solid #EA5455;background:rgba(234,84,85,0.06);border-radius:0 8px 8px 0;margin-bottom:20px;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;color:${colors.TEXT_MAIN};line-height:1.6;">
          🚫 <strong>Didn't request this?</strong> Your password won't change unless you click the link above.
          If you're concerned, please contact support.
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:13px;color:#A5ADB7;text-align:center;">
      Or copy this link:<br/>
      <a href="${resetUrl}" style="color:${colors.PRIMARY};word-break:break-all;">${resetUrl}</a>
    </p>
  `

  return {
    subject: 'Reset your LexEd password',
    html: baseLayout(content, 'You requested a password reset for your LexEd account'),
  }
}
