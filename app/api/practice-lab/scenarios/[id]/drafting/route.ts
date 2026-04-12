/**
 * POST /api/practice-lab/scenarios/[id]/drafting
 *
 * Proxies case-draft and contract-draft requests to the Python AI service.
 * Builds scenario context server-side — the frontend never sends raw scenario data.
 *
 * ?action=analyze  → POST /drafting/analyze  (JSON report)
 * ?action=chat     → POST /drafting/chat     (SSE stream)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

const analyzeBodySchema = z.object({
  draftText: z.string().min(20, 'Draft must be at least 20 characters'),
})

const chatBodySchema = z.object({
  draftText: z.string().min(1),
  messages: z.array(messageSchema).min(1),
})

const DRAFTING_MODULE_TYPES = ['CASE_DRAFTING', 'CONTRACT_DRAFTING'] as const

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')
    const action = req.nextUrl.searchParams.get('action') ?? 'analyze'

    const body = await req.json()

    // Load scenario and verify access
    const scenario = await prisma.practiceScenario.findFirst({
      where: {
        id: params.id,
        instituteId: user.instituteId!,
        moduleType: { in: DRAFTING_MODULE_TYPES },
        isPublished: true,
        isActive: true,
      },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    const c = (scenario.content && typeof scenario.content === 'object' && !Array.isArray(scenario.content))
      ? (scenario.content as Record<string, unknown>)
      : {}

    // Build unified scenario context for AI service
    const scenarioContext = {
      moduleType: scenario.moduleType,
      title: scenario.title,
      // case drafting fields
      facts:         Array.isArray(c.facts)         ? (c.facts as string[])         : [],
      issues:        Array.isArray(c.issues)        ? (c.issues as string[])        : [],
      applicableLaw: Array.isArray(c.applicableLaw) ? (c.applicableLaw as string[]) : [],
      instructions:  typeof c.instructions === 'string' ? c.instructions : '',
      brief:         typeof c.brief === 'string' ? c.brief : null,
      // contract drafting fields
      contractType:    typeof c.contractType === 'string' ? c.contractType : null,
      partyA:          typeof c.partyA === 'string'       ? c.partyA       : null,
      partyB:          typeof c.partyB === 'string'       ? c.partyB       : null,
      background:      typeof c.background === 'string'   ? c.background   : null,
      requiredClauses: Array.isArray(c.requiredClauses) ? (c.requiredClauses as string[]) : [],
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
    const internalKey  = process.env.AI_INTERNAL_SECRET ?? ''

    if (action === 'analyze') {
      const parsed = analyzeBodySchema.safeParse(body)
      if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

      const aiRes = await fetch(`${aiServiceUrl}/drafting/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
        body: JSON.stringify({ scenario: scenarioContext, draftText: parsed.data.draftText }),
      })

      if (!aiRes.ok) {
        const text = await aiRes.text().catch(() => 'unknown error')
        return NextResponse.json({ error: text }, { status: 502 })
      }

      const data = await aiRes.json()
      return NextResponse.json(data)
    }

    if (action === 'chat') {
      const parsed = chatBodySchema.safeParse(body)
      if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

      const aiRes = await fetch(`${aiServiceUrl}/drafting/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
        body: JSON.stringify({
          scenario: scenarioContext,
          draftText: parsed.data.draftText,
          messages: parsed.data.messages,
        }),
      })

      if (!aiRes.ok) {
        const text = await aiRes.text().catch(() => 'unknown error')
        return NextResponse.json({ error: text }, { status: 502 })
      }

      return new Response(aiRes.body, {
        headers: {
          'Content-Type':      'text/event-stream',
          'Cache-Control':     'no-cache',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    return errorResponse('VALIDATION', 'Invalid action. Use ?action=analyze or ?action=chat', 422)
  } catch (e) {
    return handleRouteError(e)
  }
}
