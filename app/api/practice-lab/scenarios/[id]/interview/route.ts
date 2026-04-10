/**
 * POST /api/practice-lab/scenarios/[id]/interview
 *
 * Proxies client-interview chat & report requests to the Python AI service.
 * Fetches the scenario from DB to build the context — the frontend never sends raw scenario data.
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

const bodySchema = z.object({
  messages: z.array(messageSchema).min(0),
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

    // Load scenario and verify access
    const scenario = await prisma.practiceScenario.findFirst({
      where: {
        id: params.id,
        instituteId: user.instituteId!,
        moduleType: 'CLIENT_INTERVIEW',
        isPublished: true,
        isActive: true,
      },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    const c = (scenario.content && typeof scenario.content === 'object' && !Array.isArray(scenario.content))
      ? (scenario.content as Record<string, unknown>)
      : {}

    const scenarioContext = {
      clientName: scenario.clientName ?? 'Client',
      caseType:   scenario.caseType   ?? null,
      caseId:     scenario.caseId     ?? null,
      brief:      typeof c.brief === 'string' ? c.brief : null,
      facts:      Array.isArray(c.facts) ? (c.facts as string[]) : [],
      provisions: Array.isArray(c.provisions) ? (c.provisions as string[]) : [],
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
    const internalKey  = process.env.AI_INTERNAL_SECRET ?? ''

    const { messages, generateReport } = parsed.data
    const endpoint = generateReport ? '/interview/report' : '/interview/chat'

    const aiRes = await fetch(`${aiServiceUrl}${endpoint}`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-internal-key': internalKey,
      },
      body: JSON.stringify({ scenario: scenarioContext, messages }),
    })

    if (!aiRes.ok) {
      const text = await aiRes.text().catch(() => 'unknown error')
      return NextResponse.json({ error: text }, { status: 502 })
    }

    // Report: return JSON directly
    if (generateReport) {
      const data = await aiRes.json()
      return NextResponse.json(data)
    }

    // Chat: stream SSE back to the client
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
