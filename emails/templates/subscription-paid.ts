import { baseLayout, colors } from '../base'

interface SubscriptionPaidEmailOptions {
  adminName:        string
  instituteName:    string
  planName:         string
  amount:           number
  billingPeriodEnd: Date
  loginUrl:         string
}

export function subscriptionPaidEmail(opts: SubscriptionPaidEmailOptions): { subject: string; html: string } {
  const { adminName, instituteName, planName, amount, billingPeriodEnd, loginUrl } = opts

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount)

  const formattedDate = billingPeriodEnd.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const content = `
    <!-- Success icon -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;
                  border-radius:50%;background:#28a74515;margin:0 auto;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
             stroke="#28a745" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#2d2d3f;text-align:center;">
      Payment Successful!
    </h2>
    <p style="margin:0 0 28px;font-size:15px;color:#6c757d;text-align:center;">
      Your institute is now fully active on LedX Learn.
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#444;">
      Hi <strong>${adminName}</strong>,
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
      We've received your subscription payment for <strong>${instituteName}</strong>.
      Your account has been upgraded and all features are now unlocked.
    </p>

    <!-- Receipt box -->
    <div style="background:#f8f7ff;border:1px solid #e8e4ff;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;
                letter-spacing:.8px;color:${colors.PRIMARY};">Receipt Summary</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6c757d;">Plan</td>
          <td style="padding:6px 0;font-size:14px;color:#2d2d3f;font-weight:600;text-align:right;">${planName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6c757d;">Amount Paid</td>
          <td style="padding:6px 0;font-size:14px;color:#2d2d3f;font-weight:600;text-align:right;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6c757d;">Next Renewal</td>
          <td style="padding:6px 0;font-size:14px;color:#2d2d3f;font-weight:600;text-align:right;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6c757d;">Institute</td>
          <td style="padding:6px 0;font-size:14px;color:#2d2d3f;font-weight:600;text-align:right;">${instituteName}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${loginUrl}"
         style="display:inline-block;padding:13px 32px;background:${colors.PRIMARY};
                color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
        Go to Dashboard
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#9a9aaa;text-align:center;line-height:1.6;">
      Your subscription renews on <strong>${formattedDate}</strong>. If you have any questions
      about your billing, reply to this email and we'll be happy to help.
    </p>
  `

  return {
    subject: `Payment Confirmed — ${instituteName} is now Active`,
    html:    baseLayout(content, `Payment received for ${instituteName}. Your institute is now active.`),
  }
}
