import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const institute = await prisma.institute.findFirst({
      where: {
        OR: [{ publicSlug: params.slug }, { subdomain: params.slug }],
        isPublic: true,
      },
      select: { id: true },
    })
    if (!institute) return errorResponse('NOT_FOUND', 'Institute not found', 404)

    const { searchParams } = new URL(req.url)
    const search   = searchParams.get('search')   ?? ''
    const category = searchParams.get('category') ?? ''

    const courses = await prisma.course.findMany({
      where: {
        instituteId:        institute.id,
        status:             'PUBLISHED',
        isPublicEnrollable: true,
        ...(search   ? { title:    { contains: search,   mode: 'insensitive' } } : {}),
        ...(category ? { category: { equals:   category, mode: 'insensitive' } } : {}),
      },
      select: {
        id:                 true,
        title:              true,
        previewDescription: true,
        description:        true,
        thumbnailUrl:       true,
        price:              true,
        category:           true,
        tutor: { select: { name: true, avatarUrl: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const categories = await prisma.course.findMany({
      where: { instituteId: institute.id, status: 'PUBLISHED', isPublicEnrollable: true },
      select: { category: true },
      distinct: ['category'],
    })

    return NextResponse.json({ courses, categories: categories.map((c) => c.category) })
  } catch (e) {
    return handleRouteError(e)
  }
}
