import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse, handleRouteError } from '@/lib/errors'
import { sendEmail } from '@/lib/email'
import { welcomeAdminEmail } from '@/emails/templates/welcome-admin'

const createSchema = z.object({
  name:       z.string().min(2),
  subdomain:  z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  adminEmail: z.string().email(),
  adminName:  z.string().min(2),
  planId:     z.string().uuid(),
  phone:      z.string().optional(),
  region:     z.string().optional(),
  trialDays:  z.coerce.number().int().min(1).max(365).default(14),
})

export async function GET(req: NextRequest) {
  try {
    await requireRole('SUPER_ADMIN')

    const { searchParams } = new URL(req.url)
    const status  = searchParams.get('status')  ?? undefined
    const planId  = searchParams.get('planId')  ?? undefined
    const page    = Math.max(1, Number(searchParams.get('page')  ?? 1))
    const limit   = Math.min(100, Number(searchParams.get('limit') ?? 20))

    const where = {
      ...(status ? { status: status as any } : {}),
      ...(planId ? { planId } : {}),
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const [institutes, total, newThisMonth] = await Promise.all([
      prisma.institute.findMany({
        where,
        include: {
          plan: { select: { id: true, name: true, priceMonthly: true, maxStudents: true } },
          users: { where: { role: 'ADMIN' }, select: { name: true, email: true }, take: 1 },
          _count: { select: { users: { where: { role: 'STUDENT' } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.institute.count({ where }),
      prisma.institute.count({ where: { createdAt: { gte: monthStart } } }),
    ])

    // Per-institute revenue (captured subscription payments)
    const instituteIds = institutes.map((i) => i.id)
    const revenueRows = await prisma.subscriptionPayment.groupBy({
      by: ['instituteId'],
      where: { instituteId: { in: instituteIds }, status: 'CAPTURED' },
      _sum: { amount: true },
    })
    const revenueMap = Object.fromEntries(
      revenueRows.map((r) => [r.instituteId, Number(r._sum.amount ?? 0)])
    )

    const result = institutes.map((inst) => ({
      ...inst,
      adminName:  inst.users[0]?.name  ?? '—',
      adminEmail: inst.users[0]?.email ?? '—',
      revenue:    revenueMap[inst.id]  ?? 0,
      users:      undefined, // strip raw users array from response
    }))

    return NextResponse.json({ institutes: result, total, newThisMonth, page, limit })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('SUPER_ADMIN')

    const body = createSchema.safeParse(await req.json())
    if (!body.success)
      return errorResponse('VALIDATION_ERROR', body.error.errors[0].message, 422)

    const { name, subdomain, adminEmail, adminName, planId, phone, region, trialDays } = body.data

    const existing = await prisma.institute.findUnique({ where: { subdomain } })
    if (existing) return errorResponse('CONFLICT', 'Subdomain already taken', 409)

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan) return errorResponse('NOT_FOUND', 'Plan not found', 404)

    const institute = await prisma.institute.create({
      data: {
        name,
        subdomain,
        planId,
        phone,
        region,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.user.create({
      data: {
        instituteId:  institute.id,
        email:        adminEmail,
        name:         adminName,
        passwordHash: await bcrypt.hash('ChangeMe@123', 10),
        role:         'ADMIN',
      },
    })

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
    const { subject, html } = welcomeAdminEmail({
      adminName, instituteName: name, adminEmail, tempPassword: 'ChangeMe@123', loginUrl,
    })
    await sendEmail({ to: adminEmail, subject, html })

    return NextResponse.json({ institute }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
