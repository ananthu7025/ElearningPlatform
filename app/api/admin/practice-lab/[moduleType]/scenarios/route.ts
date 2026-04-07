import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { PracticeModuleType } from '@prisma/client'

const VALID_TYPES = Object.values(PracticeModuleType)

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
