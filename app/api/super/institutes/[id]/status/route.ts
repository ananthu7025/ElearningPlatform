import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse, handleRouteError } from '@/lib/errors'
import { redis, redisKeys } from '@/lib/redis'

const schema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL']),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('SUPER_ADMIN')

    const { id } = await params
    const body = schema.safeParse(await req.json())
    if (!body.success) return errorResponse('VALIDATION_ERROR', body.error.errors[0].message, 422)

    const institute = await prisma.institute.findUnique({ where: { id } })
    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found', 404)

    const updated = await prisma.institute.update({
      where: { id },
      data: { status: body.data.status },
    })

    // Bust the subdomain cache so middleware picks up the new status
    await redis.del(redisKeys.tenantSubdomain(institute.subdomain))

    return NextResponse.json({ institute: updated })
  } catch (e) {
    return handleRouteError(e)
  }
}
