import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const schema = z.object({
  fileName:    z.string().min(1),
  contentType: z.string().min(1),
  folder:      z.enum(['thumbnails', 'materials', 'avatars']).default('materials'),
})

const r2 = new S3Client({
  region:   'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'TUTOR')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const { contentType, folder } = parsed.data
    const ext = parsed.data.fileName.split('.').pop()
    const key = `${folder}/${randomUUID()}.${ext}`

    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, ContentType: contentType }),
      { expiresIn: 300 }
    )

    return NextResponse.json({ url, key, publicUrl: `${process.env.R2_PUBLIC_URL}/${key}` })
  } catch (e) {
    return handleRouteError(e)
  }
}
