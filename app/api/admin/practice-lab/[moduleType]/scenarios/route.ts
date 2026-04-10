import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { PracticeModuleType } from '@prisma/client'
import { clientInterviewCreateSchema } from '@/lib/practiceLab/clientInterviewScenario'

const VALID_TYPES = Object.values(PracticeModuleType)

export async function POST(
  req: NextRequest,
  { params }: { params: { moduleType: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const moduleType = params.moduleType as PracticeModuleType
    if (!VALID_TYPES.includes(moduleType)) {
      return errorResponse('VALIDATION', 'Invalid module type', 422)
    }

    if (moduleType !== PracticeModuleType.CLIENT_INTERVIEW) {
      return errorResponse(
        'VALIDATION',
        'Creating scenarios for this module type is not enabled yet. Use Client Interview for now.',
        422
      )
    }

    const body = await req.json()
    const parsed = clientInterviewCreateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors as Record<string, unknown>, 422)
    }

    const scenario = await prisma.practiceScenario.create({
      data: {
        instituteId,
        moduleType: PracticeModuleType.CLIENT_INTERVIEW,
        title: parsed.data.title,
        description: parsed.data.description,
        difficulty: parsed.data.difficulty,
        clientName: parsed.data.clientName ?? null,
        caseType: parsed.data.caseType ?? null,
        caseId: parsed.data.caseId ?? null,
        content: parsed.data.content as object,
        isPublished: parsed.data.isPublished ?? false,
        tutorId: null,
      },
    })

    return NextResponse.json({ scenario: { id: scenario.id } }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { moduleType: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const moduleType = params.moduleType as PracticeModuleType
    if (!VALID_TYPES.includes(moduleType)) {
      return errorResponse('VALIDATION', 'Invalid module type', 422)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // 'published' | 'draft' | null

    const wherePublished =
      status === 'published' ? true
      : status === 'draft'   ? false
      : undefined

    const scenarios = await prisma.practiceScenario.findMany({
      where: {
        instituteId,
        moduleType,
        isActive: true,
        ...(wherePublished !== undefined ? { isPublished: wherePublished } : {}),
      },
      include: {
        tutor: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate avg AI score per scenario
    const scenarioIds = scenarios.map((s) => s.id)
    const avgScores = await prisma.practiceSubmission.groupBy({
      by: ['scenarioId'],
      where: { scenarioId: { in: scenarioIds } },
      _avg: { aiScore: true },
    })
    const avgScoreMap: Record<string, number> = {}
    for (const r of avgScores) {
      avgScoreMap[r.scenarioId] = r._avg.aiScore ? Math.round(r._avg.aiScore) : 0
    }

    const result = scenarios.map((s) => ({
      id:          s.id,
      title:       s.title,
      clientName:  s.clientName,
      caseType:    s.caseType,
      caseId:      s.caseId,
      difficulty:  s.difficulty,
      isPublished: s.isPublished,
      createdAt:   s.createdAt,
      tutor:       s.tutor,
      attempts:    s._count.submissions,
      avgScore:    avgScoreMap[s.id] ?? 0,
      // Extract facts/provisions count from content JSON if available
      factsCount:      (s.content as any)?.facts?.length      ?? 0,
      provisionsCount: (s.content as any)?.provisions?.length ?? 0,
    }))

    // Aggregate stats
    const published      = result.filter((s) => s.isPublished).length
    const totalAttempts  = result.reduce((sum, s) => sum + s.attempts, 0)
    const scoredScenarios = result.filter((s) => s.avgScore > 0)
    const overallAvgScore = scoredScenarios.length > 0
      ? Math.round(scoredScenarios.reduce((sum, s) => sum + s.avgScore, 0) / scoredScenarios.length)
      : 0

    return NextResponse.json({
      scenarios: result,
      stats: {
        total: result.length,
        published,
        totalAttempts,
        avgScore: overallAvgScore,
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
