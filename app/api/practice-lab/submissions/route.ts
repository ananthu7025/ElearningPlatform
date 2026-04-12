import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'
import type { PracticeScenario } from '@prisma/client'

async function triggerDraftingEval(
  submissionId: string,
  scenario: PracticeScenario,
  draftText: string
) {
  const c = (scenario.content && typeof scenario.content === 'object' && !Array.isArray(scenario.content))
    ? (scenario.content as Record<string, unknown>)
    : {}

  const scenarioContext = {
    moduleType: scenario.moduleType,
    title: scenario.title,
    facts:         Array.isArray(c.facts)         ? (c.facts as string[])         : [],
    issues:        Array.isArray(c.issues)        ? (c.issues as string[])        : [],
    applicableLaw: Array.isArray(c.applicableLaw) ? (c.applicableLaw as string[]) : [],
    instructions:  typeof c.instructions === 'string' ? c.instructions : '',
    brief:         typeof c.brief === 'string' ? c.brief : null,
    contractType:    typeof c.contractType === 'string' ? c.contractType : null,
    partyA:          typeof c.partyA === 'string'       ? c.partyA       : null,
    partyB:          typeof c.partyB === 'string'       ? c.partyB       : null,
    background:      typeof c.background === 'string'   ? c.background   : null,
    requiredClauses: Array.isArray(c.requiredClauses) ? (c.requiredClauses as string[]) : [],
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
  const internalKey  = process.env.AI_INTERNAL_SECRET ?? ''

  const res = await fetch(`${aiServiceUrl}/drafting/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
    body: JSON.stringify({ scenario: scenarioContext, draftText }),
  })

  if (!res.ok) return

  const { report } = await res.json()
  const score = typeof report?.overallScore === 'number' ? report.overallScore : null

  await prisma.practiceSubmission.update({
    where: { id: submissionId },
    data: {
      aiScore:    score,
      aiFeedback: report ?? null,
      status:     'EVALUATED',
      evaluatedAt: new Date(),
    },
  })
}

const submitSchema = z.object({
  scenarioId: z.string().uuid(),
  content:    z.string().min(20, 'Please submit a meaningful response'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const submissions = await prisma.practiceSubmission.findMany({
      where: { scenario: { instituteId: user.instituteId! } },
      include: {
        student:  { select: { id: true, name: true } },
        scenario: { select: { id: true, title: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ submissions })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT')

    const body = await req.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const scenario = await prisma.practiceScenario.findFirst({
      where: {
        id: parsed.data.scenarioId,
        instituteId: user.instituteId!,
        isPublished: true,
        isActive: true,
      },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    const mod = await prisma.practiceModule.findUnique({
      where: {
        instituteId_moduleType: { instituteId: user.instituteId!, moduleType: scenario.moduleType },
      },
    })
    if (mod && !mod.isEnabled) {
      return errorResponse('NOT_FOUND', 'Scenario not found', 404)
    }

    const submission = await prisma.practiceSubmission.create({
      data: {
        scenarioId: parsed.data.scenarioId,
        submissionText: parsed.data.content,
        studentId: user.userId
      },
    })

    // Trigger async AI grading for drafting modules
    const DRAFTING_TYPES = ['CASE_DRAFTING', 'CONTRACT_DRAFTING']
    if (DRAFTING_TYPES.includes(scenario.moduleType)) {
      triggerDraftingEval(submission.id, scenario, parsed.data.content).catch(() => {})
    }

    return NextResponse.json({ submission }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
