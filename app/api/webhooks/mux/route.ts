import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId:     process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('mux-signature') ?? ''

  try {
    mux.webhooks.verifySignature(body, req.headers as any, process.env.MUX_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  // Fired when Mux creates an asset from a direct upload.
  // `data.passthrough` contains the lessonId we set at upload time.
  if (event.type === 'video.upload.asset_created') {
    const lessonId = event.data?.passthrough as string | undefined
    const assetId  = event.data?.asset_id    as string | undefined

    if (lessonId && assetId) {
      await prisma.lesson.update({
        where: { id: lessonId },
        data:  { muxAssetId: assetId },
      }).catch(() => { /* lesson may not exist yet — ignore */ })
    }
  }

  // Fired when the asset finishes processing and playback is available.
  if (event.type === 'video.asset.ready') {
    const assetId    = event.data.id as string
    const playbackId = (event.data.playback_ids as any[])?.[0]?.id
    const duration   = event.data.duration as number | undefined   // seconds (float)

    if (playbackId) {
      await prisma.lesson.updateMany({
        where: { muxAssetId: assetId },
        data:  {
          muxPlaybackId:   playbackId,
          ...(duration ? { durationSeconds: Math.round(duration) } : {}),
        },
      })
    }
  }

  return NextResponse.json({ received: true })
}
