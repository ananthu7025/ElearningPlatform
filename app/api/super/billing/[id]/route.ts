import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'

export async function GET(
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
            id: true,
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
        plan: { select: { id: true, name: true, features: true } },
      },
    })

    return NextResponse.json({ payment })
  } catch (e) {
    return handleRouteError(e)
  }
}
