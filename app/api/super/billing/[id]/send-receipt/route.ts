import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'
import { sendEmail } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole('SUPER_ADMIN')

    const payment = await prisma.subscriptionPayment.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        institute: {
          select: {
            name: true,
            subdomain: true,
            phone: true,
            users: {
              where: { role: 'ADMIN', isActive: true },
              select: { email: true, name: true },
              take: 1,
            },
          },
        },
        plan: { select: { name: true } },
      },
    })

    const adminUser = payment.institute.users[0]
    if (!adminUser) {
      return NextResponse.json({ error: 'No admin user found for this institute' }, { status: 400 })
    }

    const fmt = (n: number) =>
      '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 })

    const amount = Number(payment.amount)
    const periodStart = new Date(payment.billingPeriodStart).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
    const periodEnd = new Date(payment.billingPeriodEnd).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
    const paidDate = new Date(payment.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    const statusColor: Record<string, string> = {
      CAPTURED: '#28C76F',
      PENDING: '#FF9F43',
      FAILED: '#FF4C51',
      REFUNDED: '#808390',
    }
    const color = statusColor[payment.status] ?? '#808390'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Subscription Receipt</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f5f6;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#7367F0,#9E95F5);padding:32px 40px">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">LedxElearn</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Subscription Receipt</p>
    </div>
    <div style="padding:32px 40px">
      <p style="margin:0 0 24px;color:#444;font-size:15px">Dear <strong>${adminUser.name}</strong>,</p>
      <p style="margin:0 0 24px;color:#444;font-size:15px">
        Here is your subscription receipt for <strong>${payment.institute.name}</strong>.
      </p>

      <div style="background:#f8f8fb;border-radius:8px;padding:20px 24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="color:#888;font-size:13px;padding:6px 0;width:160px">Receipt ID:</td>
            <td style="color:#333;font-weight:600;font-size:13px;font-family:monospace">${payment.id.substring(0, 8).toUpperCase()}</td>
          </tr>
          ${payment.razorpayPaymentId ? `
          <tr>
            <td style="color:#888;font-size:13px;padding:6px 0">Payment ID:</td>
            <td style="color:#333;font-weight:600;font-size:13px;font-family:monospace">${payment.razorpayPaymentId}</td>
          </tr>` : ''}
          <tr>
            <td style="color:#888;font-size:13px;padding:6px 0">Date:</td>
            <td style="color:#333;font-weight:600;font-size:13px">${paidDate}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:13px;padding:6px 0">Status:</td>
            <td>
              <span style="display:inline-block;background:${color}20;color:${color};font-size:12px;font-weight:700;padding:2px 10px;border-radius:50px">
                ${payment.status}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <table style="width:100%;border-collapse:collapse;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:24px">
        <thead>
          <tr style="background:#f8f8fb">
            <th style="text-align:left;padding:12px 16px;color:#555;font-size:13px">Plan</th>
            <th style="text-align:left;padding:12px 16px;color:#555;font-size:13px">Billing Period</th>
            <th style="text-align:right;padding:12px 16px;color:#555;font-size:13px">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:14px 16px;color:#333;font-size:14px;font-weight:600">${payment.plan.name}</td>
            <td style="padding:14px 16px;color:#555;font-size:13px">${periodStart} – ${periodEnd}</td>
            <td style="padding:14px 16px;text-align:right;color:#333;font-weight:700;font-size:15px">${fmt(amount)}</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align:right;border-top:2px solid #7367F0;padding-top:16px;margin-bottom:32px">
        <span style="color:#888;font-size:13px">Total: </span>
        <span style="color:#7367F0;font-size:22px;font-weight:800">${fmt(amount)}</span>
      </div>

      <p style="color:#888;font-size:12px;margin:0;border-top:1px solid #eee;padding-top:16px">
        This is an automatically generated receipt. For support, contact
        <a href="mailto:support@ledxelearn.com" style="color:#7367F0">support@ledxelearn.com</a>.
      </p>
    </div>
  </div>
</body>
</html>`

    await sendEmail({
      to: adminUser.email,
      subject: `Subscription Receipt – ${payment.plan.name} Plan (${paidDate})`,
      html,
    })

    return NextResponse.json({ success: true, sentTo: adminUser.email })
  } catch (e) {
    return handleRouteError(e)
  }
}
