/**
 * POST /api/practice-lab/scenarios/[id]/mediation
 *
 * Proxies arbitration/mediation session requests to the Python AI service.
 * Fetches the scenario from DB to build the context — the frontend never sends raw scenario data.
 *
 * Body:
 *   { messages, addressedTo, generateReport }
 *   - messages:      chat history so far
 *   - addressedTo:   "partyA" | "partyB" | "both" — who the student is speaking to
 *   - generateReport: true → POST /mediation/report (JSON), false → POST /mediation/chat (SSE)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  addressedTo: z.enum(['partyA', 'partyB', 'both']).optional(),
})

const bodySchema = z.object({
  messages:       z.array(messageSchema).min(0),
  addressedTo:    z.enum(['partyA', 'partyB', 'both']).default('both'),
  generateReport: z.boolean().optional().default(false),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('STUDENT', 'TUTOR', 'ADMIN')

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)
    }

    const scenario = await prisma.practiceScenario.findFirst({
      where: {
        id:          params.id,
        instituteId: user.instituteId!,
        moduleType:  'ARBITRATION_MEDIATION',
        isPublished: true,
        isActive:    true,
      },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    const c = (scenario.content && typeof scenario.content === 'object' && !Array.isArray(scenario.content))
      ? (scenario.content as Record<string, unknown>)
      : {}

    const toParty = (raw: unknown): { name: string; role: string; position: string; interests: string; facts: string[] } => {
      const p = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {}
      return {
        name:      typeof p.name      === 'string' ? p.name      : 'Party',
        role:      typeof p.role      === 'string' ? p.role      : '',
        position:  typeof p.position  === 'string' ? p.position  : '',
        interests: typeof p.interests === 'string' ? p.interests : '',
        facts:     Array.isArray(p.facts) ? (p.facts as string[]) : [],
      }
    }

    const scenarioContext = {
      mode:           typeof c.mode        === 'string' ? c.mode        : 'mediation',
      disputeType:    typeof c.disputeType === 'string' ? c.disputeType : null,
      background:     typeof c.background  === 'string' ? c.background  : null,
      partyA:         toParty(c.partyA),
      partyB:         toParty(c.partyB),
      applicableLaw:  Array.isArray(c.applicableLaw) ? (c.applicableLaw as string[]) : [],
      instructions:   typeof c.instructions === 'string' ? c.instructions : null,
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL   ?? 'http://localhost:8000'
    const internalKey  = process.env.AI_INTERNAL_SECRET ?? ''

    const { messages, addressedTo, generateReport } = parsed.data
    const endpoint = generateReport ? '/mediation/report' : '/mediation/chat'

    const aiRes = await fetch(`${aiServiceUrl}${endpoint}`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-internal-key': internalKey,
      },
      body: JSON.stringify({ scenario: scenarioContext, messages, addressedTo }),
    })

    if (!aiRes.ok) {
      const text = await aiRes.text().catch(() => 'unknown error')
      return NextResponse.json({ error: text }, { status: 502 })
    }

    if (generateReport) {
      const data = await aiRes.json()
      return NextResponse.json(data)
    }

    return new Response(aiRes.body, {
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
