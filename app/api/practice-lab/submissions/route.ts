import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError, errorResponse } from '@/lib/errors'
import { z } from 'zod'

const submitSchema = z.object({
  scenarioId: z.string().uuid(),
  content:    z.string().min(20, 'Please submit a meaningful response'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('TUTOR', 'ADMIN')

    const submissions = await prisma.practiceSubmission.findMany({
      where: { scenario: { instituteId: user.instituteId! } },
      include: {
        student:  { select: { id: true, name: true } },
        scenario: { select: { id: true, title: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ submissions })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('STUDENT')

    const body = await req.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) return errorResponse('VALIDATION', parsed.error.flatten().fieldErrors, 422)

    const scenario = await prisma.practiceScenario.findFirst({
      where: {
        id: parsed.data.scenarioId,
        instituteId: user.instituteId!,
        isPublished: true,
        isActive: true,
      },
    })
    if (!scenario) return errorResponse('NOT_FOUND', 'Scenario not found', 404)

    const mod = await prisma.practiceModule.findUnique({
      where: {
        instituteId_moduleType: { instituteId: user.instituteId!, moduleType: scenario.moduleType },
      },
    })
    if (mod && !mod.isEnabled) {
      return errorResponse('NOT_FOUND', 'Scenario not found', 404)
    }

    const submission = await prisma.practiceSubmission.create({
      data: { 
        scenarioId: parsed.data.scenarioId,
        submissionText: parsed.data.content,
        studentId: user.userId 
      },
    })

    // TODO: enqueue AI grading job via BullMQ

    return NextResponse.json({ submission }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
