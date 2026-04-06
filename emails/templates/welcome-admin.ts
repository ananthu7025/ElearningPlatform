import { baseLayout, colors } from '../base'

interface WelcomeAdminParams {
  adminName:     string
  instituteName: string
  adminEmail:    string
  tempPassword:  string
  loginUrl:      string
}

export function welcomeAdminEmail(params: WelcomeAdminParams): { subject: string; html: string } {
  const { adminName, instituteName, adminEmail, tempPassword, loginUrl } = params

  const content = `
    <!-- Greeting icon -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:14px;background:rgba(115,103,240,0.12);">
        <span style="font-size:28px;">🏛️</span>
      </div>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${colors.TEXT_HEAD};text-align:center;">
      Welcome to LexEd, ${adminName}!
    </h1>
    <p style="margin:0 0 28px;font-size:15px;color:${colors.TEXT_MAIN};text-align:center;line-height:1.6;">
      Your institute <strong>${instituteName}</strong> has been successfully onboarded.<br/>
      Here are your admin login credentials.
    </p>

    <!-- Credentials box -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#F4F5FA;border-radius:10px;margin-bottom:28px;">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${colors.TEXT_HEAD};text-transform:uppercase;letter-spacing:0.5px;">
            Your Login Credentials
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:${colors.TEXT_MAIN};width:100px;">Email</td>
              <td style="padding:6px 0;font-size:14px;font-weight:600;color:${colors.TEXT_HEAD};font-family:monospace;">
                ${adminEmail}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:${colors.TEXT_MAIN};">Password</td>
              <td style="padding:6px 0;font-size:14px;font-weight:600;color:${colors.TEXT_HEAD};font-family:monospace;">
                ${tempPassword}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Security note -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="border-left:3px solid ${colors.PRIMARY};background:rgba(115,103,240,0.06);border-radius:0 8px 8px 0;margin-bottom:32px;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;color:${colors.TEXT_MAIN};line-height:1.6;">
          ⚠️ <strong>Please change your password</strong> immediately after your first login for security.
        </td>
      </tr>
    </table>

    <!-- CTA button -->
    <div style="text-align:center;margin-bottom:12px;">
      <a href="${loginUrl}"
        style="display:inline-block;padding:14px 40px;background:${colors.PRIMARY};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
        Login to Your Dashboard
      </a>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#A5ADB7;text-align:center;">
      Or copy this link: <a href="${loginUrl}" style="color:${colors.PRIMARY};word-break:break-all;">${loginUrl}</a>
    </p>
  `

  return {
    subject: `Welcome to LexEd — Your institute "${instituteName}" is live`,
    html: baseLayout(content, `Your LexEd admin credentials for ${instituteName}`),
  }
}
