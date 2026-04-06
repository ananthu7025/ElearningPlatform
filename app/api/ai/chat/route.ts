import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleRouteError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    await requireRole('STUDENT', 'TUTOR', 'ADMIN')

    const body = await req.json()

    // Forward to Python AI service and stream back
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/chat`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-internal-key':  process.env.AI_INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify(body),
    })

    if (!aiRes.ok) {
      return new Response('AI service error', { status: 502 })
    }

    // Stream the SSE response directly back to the client
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
