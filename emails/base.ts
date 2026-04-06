/**
 * Base HTML email layout — wraps all templates with consistent branding.
 * Brand color and app name are pulled from env so they work across environments.
 */

const APP_NAME  = 'LexEd'
const PRIMARY   = '#7367F0'
const BG_BODY   = '#F4F5FA'
const BG_CARD   = '#FFFFFF'
const TEXT_MAIN = '#566A7F'
const TEXT_HEAD = '#32475C'

export function baseLayout(content: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG_BODY};font-family:'Public Sans',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">

  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;‌&nbsp;‌&nbsp;</div>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BG_BODY};padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Logo / Brand header -->
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:700;color:${PRIMARY};letter-spacing:-0.5px;">${APP_NAME}</span>
              <span style="font-size:12px;color:${TEXT_MAIN};margin-left:6px;letter-spacing:1px;text-transform:uppercase;">Platform</span>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;width:100%;background-color:${BG_CARD};border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(50,71,92,0.08);">

          <!-- Purple top bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,${PRIMARY} 0%,#9E95F5 100%);"></td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #ECEEF1;">
              <p style="margin:0;font-size:12px;color:#A5ADB7;text-align:center;line-height:1.6;">
                This email was sent by <strong style="color:${TEXT_MAIN};">${APP_NAME}</strong> — the white-label LMS for law coaching institutes.<br/>
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

export const colors = { PRIMARY, TEXT_MAIN, TEXT_HEAD }
