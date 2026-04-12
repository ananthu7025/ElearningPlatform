import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/errors'
import { PracticeModuleType } from '@prisma/client'

const MODULE_META: Record<
  PracticeModuleType,
  { id: string; icon: string; color: string; title: string; type: string; typeColor: string; difficulty: string; diffColor: string; xp: number; time: string }
> = {
  CLIENT_INTERVIEW:      { id: 'client-interview',      icon: 'tabler-briefcase',     color: 'success',   title: 'Client Interview Room',        type: 'Skill',    typeColor: 'success',   difficulty: 'Beginner',     diffColor: 'success', xp: 150, time: '20–30 min' },
  CASE_DRAFTING:         { id: 'case-drafting',         icon: 'tabler-edit',          color: 'primary',   title: 'Case Drafting Studio',         type: 'Drafting', typeColor: 'primary',   difficulty: 'Intermediate', diffColor: 'warning', xp: 200, time: '45–60 min' },
  CONTRACT_DRAFTING:     { id: 'contract-drafting',     icon: 'tabler-clipboard-text',color: 'warning',   title: 'Contract Drafting Desk',       type: 'Drafting', typeColor: 'warning',   difficulty: 'Intermediate', diffColor: 'warning', xp: 250, time: '40–60 min' },
  MOOT_COURT:            { id: 'moot-court',            icon: 'tabler-microphone',    color: 'danger',    title: 'Moot Court Simulator',         type: 'Advocacy', typeColor: 'danger',    difficulty: 'Advanced',     diffColor: 'danger',  xp: 350, time: '30–45 min' },
  LEGAL_RESEARCH:        { id: 'legal-research',        icon: 'tabler-search',        color: 'info',      title: 'Legal Research Arena',         type: 'Research', typeColor: 'info',      difficulty: 'Intermediate', diffColor: 'warning', xp: 180, time: '25–35 min' },
  COURTROOM_ARGUMENT:    { id: 'courtroom-argument',    icon: 'tabler-scale',         color: 'secondary', title: 'Courtroom Argument Builder',   type: 'Advocacy', typeColor: 'secondary', difficulty: 'Advanced',     diffColor: 'danger',  xp: 300, time: '35–50 min' },
  ARBITRATION_MEDIATION: { id: 'arbitration-mediation', icon: 'tabler-handshake',     color: 'purple',    title: 'Arbitration & Mediation Lab',  type: 'ADR',      typeColor: 'purple',    difficulty: 'Advanced',     diffColor: 'danger',  xp: 320, time: '30–50 min' },
}

export async function GET() {
  try {
    const user = await requireRole('ADMIN')
    const instituteId = user.instituteId!

    const moduleTypes = Object.keys(MODULE_META) as PracticeModuleType[]

    // 1. Enabled/disabled state per module
    const moduleRows = await prisma.practiceModule.findMany({ where: { instituteId } })
    const enabledMap: Record<string, boolean> = {}
    for (const r of moduleRows) enabledMap[r.moduleType] = r.isEnabled

    // 2. All active scenarios for this institute (for counts + submission join)
    const allScenarios = await prisma.practiceScenario.findMany({
      where: { instituteId, isActive: true },
      select: {
        id:        true,
        moduleType: true,
        _count:    { select: { submissions: true } },
      },
    })

    // 3. Submission avg scores grouped by scenarioId
    const scenarioIds = allScenarios.map((s) => s.id)
    const avgScoreRows = scenarioIds.length > 0
      ? await prisma.practiceSubmission.groupBy({
          by:    ['scenarioId'],
          where: { scenarioId: { in: scenarioIds } },
          _avg:  { aiScore: true },
        })
      : []

    const avgByScenario: Record<string, number> = {}
    for (const r of avgScoreRows) {
      avgByScenario[r.scenarioId] = r._avg.aiScore ? Math.round(r._avg.aiScore) : 0
    }

    // 4. Aggregate per moduleType
    const scenarioCountMap: Record<string, number> = {}
    const attemptsMap:      Record<string, number> = {}
    const avgScoreAcc:      Record<string, { sum: number; count: number }> = {}

    for (const sc of allScenarios) {
      const mt = sc.moduleType
      scenarioCountMap[mt] = (scenarioCountMap[mt] ?? 0) + 1
      attemptsMap[mt]      = (attemptsMap[mt] ?? 0) + sc._count.submissions
      const score = avgByScenario[sc.id] ?? 0
      if (score > 0) {
        if (!avgScoreAcc[mt]) avgScoreAcc[mt] = { sum: 0, count: 0 }
        avgScoreAcc[mt].sum   += score
        avgScoreAcc[mt].count += 1
      }
    }

    const avgScoreMap: Record<string, number> = {}
    for (const [mt, acc] of Object.entries(avgScoreAcc)) {
      avgScoreMap[mt] = Math.round(acc.sum / acc.count)
    }

    // 5. Build response
    const modules = moduleTypes.map((type) => ({
      ...MODULE_META[type],
      moduleType: type,
      isEnabled:  enabledMap[type] ?? true,
      scenarios:  scenarioCountMap[type] ?? 0,
      attempts:   attemptsMap[type]      ?? 0,
      avgScore:   avgScoreMap[type]      ?? 0,
    }))

    return NextResponse.json({ modules })
  } catch (e) {
    return handleRouteError(e)
  }
}
