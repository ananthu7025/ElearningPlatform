import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'

// Agora RTC token generation — uses agora-access-token package
// Install: npm i agora-access-token
// TODO: install agora-access-token package
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('TUTOR', 'STUDENT', 'ADMIN')

    const lc = await prisma.liveClass.findFirst({
      where: { id: params.id, course: { instituteId: user.instituteId! } },
      include: { course: { select: { tutorId: true } } },
    })
    if (!lc) return errorResponse('NOT_FOUND', 'Live class not found', 404)

    const isTutor = lc.course.tutorId === user.userId || user.role === 'ADMIN'

    // If student, verify enrollment
    if (!isTutor) {
      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId: user.userId, courseId: lc.courseId },
      })
      if (!enrolled) return errorResponse('FORBIDDEN', 'Not enrolled in this course', 403)
    }

    // Agora token generation placeholder
    // In production:
    // const { RtcTokenBuilder, RtcRole } = require('agora-access-token')
    // const role = isTutor ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
    // const token = RtcTokenBuilder.buildTokenWithUid(
    //   process.env.AGORA_APP_ID, process.env.AGORA_APP_CERTIFICATE,
    //   lc.agoraChannelId, 0, role, Math.floor(Date.now() / 1000) + 3600
    // )
    const token = `agora_placeholder_${lc.agoraChannelId}`

    return NextResponse.json({
      token,
      channelName: lc.agoraChannelId,
      appId:       process.env.AGORA_APP_ID,
      uid:         0,
      role:        isTutor ? 'publisher' : 'subscriber',
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
