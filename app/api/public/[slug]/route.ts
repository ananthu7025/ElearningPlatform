import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const institute = await prisma.institute.findFirst({
      where: {
        OR: [
          { publicSlug: params.slug },
          { subdomain:  params.slug },
        ],
        isPublic: true,
      },
      select: {
        id:           true,
        name:         true,
        logoUrl:      true,
        primaryColor: true,
        publicSlug:   true,
        subdomain:    true,
        _count: { select: { courses: true, users: true } },
      },
    })

    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found or not public', 404)

    return NextResponse.json({ institute })
  } catch (e) {
    return handleRouteError(e)
  }
}
