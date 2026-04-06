import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId:     process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

const schema = z.object({
  lessonId: z.string().uuid('Must be a valid lesson UUID'),
})

export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'TUTOR')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? '*',
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier:   'baseline',
        // passthrough carries lessonId so the webhook can link asset → lesson
        passthrough:     parsed.data.lessonId,
      },
    })

    return NextResponse.json({ uploadUrl: upload.url, uploadId: upload.id })
  } catch (e) {
    return handleRouteError(e)
  }
}
