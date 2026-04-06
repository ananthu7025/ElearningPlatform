import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region:   'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function GET(_req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  try {
    const user = await requireRole('STUDENT')

    const enrollment = await prisma.enrollment.findFirst({
      where: { id: params.enrollmentId, studentId: user.userId },
    })
    if (!enrollment) return errorResponse('NOT_FOUND', 'Enrollment not found', 404)
    if (!enrollment.certificateKey) return errorResponse('NOT_FOUND', 'Certificate not yet generated', 404)

    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket:                     process.env.R2_BUCKET!,
        Key:                        enrollment.certificateKey,
        ResponseContentDisposition: 'attachment; filename="certificate.pdf"',
      }),
      { expiresIn: 300 }
    )

    return NextResponse.redirect(url)
  } catch (e) {
    return handleRouteError(e)
  }
}
