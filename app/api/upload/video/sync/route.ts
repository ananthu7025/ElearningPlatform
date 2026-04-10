/**
 * POST /api/upload/video/sync
 *
 * Called by the admin UI after a direct upload completes.
 * Polls Mux until the asset is ready, then saves muxPlaybackId to the lesson.
 * Returns immediately if already synced.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId:     process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

const schema = z.object({
  lessonId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'TUTOR')

    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { lessonId } = parsed.data

    // Already synced — return early
    const lesson = await prisma.lesson.findFirst({ where: { id: lessonId } })
    if (lesson?.muxPlaybackId) {
      return NextResponse.json({ status: 'ready', playbackId: lesson.muxPlaybackId })
    }

    // Search Mux assets for this lessonId in passthrough (last 25 uploads)
    const { data: assets } = await mux.video.assets.list({ limit: 25 })
    const asset = assets.find((a) => a.passthrough === lessonId)

    if (!asset) {
      return NextResponse.json({ status: 'not_found' })
    }

    if (asset.status !== 'ready') {
      return NextResponse.json({ status: asset.status }) // 'preparing' | 'errored'
    }

    const playbackId = asset.playback_ids?.[0]?.id
    if (!playbackId) {
      return NextResponse.json({ status: 'no_playback_id' })
    }

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        muxAssetId:      asset.id,
        muxPlaybackId:   playbackId,
        durationSeconds: asset.duration ? Math.round(asset.duration) : undefined,
      },
    })

    return NextResponse.json({ status: 'ready', playbackId })
  } catch (e) {
    return handleRouteError(e)
  }
}
