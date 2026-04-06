import { Job } from 'bullmq'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '@/lib/prisma'
import type { CertificateJobData } from '../queues'

const r2 = new S3Client({
  region:   'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function processCertificate(job: Job<CertificateJobData>) {
  const { enrollmentId, userId, courseId } = job.data

  const [enrollment, user, course] = await Promise.all([
    prisma.enrollment.findUnique({ where: { id: enrollmentId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.course.findUnique({
      where: { id: courseId },
      include: { tutor: { select: { name: true } }, institute: { select: { name: true } } },
    }),
  ])

  if (!enrollment || !user || !course) throw new Error('Missing data for certificate generation')

  // ── Build PDF ─────────────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([842, 595]) // A4 landscape
  const { width, height } = page.getSize()

  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const primaryColor = rgb(0.45, 0.40, 0.94) // #7367F0

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) })
  // Top bar
  page.drawRectangle({ x: 0, y: height - 20, width, height: 20, color: primaryColor })
  // Bottom bar
  page.drawRectangle({ x: 0, y: 0, width, height: 20, color: primaryColor })
  // Left accent
  page.drawRectangle({ x: 0, y: 0, width: 10, height, color: primaryColor })

  // Title
  page.drawText('Certificate of Completion', { x: 60, y: height - 90, size: 32, font: fontBold, color: primaryColor })

  // Body text
  page.drawText('This is to certify that', { x: 60, y: height - 155, size: 14, font: fontRegular, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(user.name, { x: 60, y: height - 195, size: 28, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText('has successfully completed the course', { x: 60, y: height - 245, size: 14, font: fontRegular, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(course.title, { x: 60, y: height - 285, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1) })

  // Details
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  page.drawText(`Instructor: ${course.tutor?.name ?? 'LexEd'}`, { x: 60, y: height - 340, size: 12, font: fontRegular, color: rgb(0.5, 0.5, 0.5) })
  page.drawText(`Institute: ${course.institute.name}`, { x: 60, y: height - 360, size: 12, font: fontRegular, color: rgb(0.5, 0.5, 0.5) })
  page.drawText(`Date: ${date}`, { x: 60, y: height - 380, size: 12, font: fontRegular, color: rgb(0.5, 0.5, 0.5) })

  // Footer
  page.drawText('LexEd — Law Exam Preparation Platform', { x: 60, y: 30, size: 10, font: fontRegular, color: rgb(0.6, 0.6, 0.6) })

  const pdfBytes = await pdfDoc.save()

  // ── Upload to R2 ──────────────────────────────────────────────────────────
  const key = `certificates/${enrollmentId}.pdf`
  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET!,
    Key:         key,
    Body:        Buffer.from(pdfBytes),
    ContentType: 'application/pdf',
  }))

  // ── Update enrollment + notify ────────────────────────────────────────────
  await prisma.$transaction([
    prisma.enrollment.update({
      where: { id: enrollmentId },
      data:  { certificateKey: key },
    }),
    prisma.notification.create({
      data: {
        userId,
        title:   'Certificate Ready!',
        body:    `Your certificate for "${course.title}" is ready to download.`,
        type:    'CERTIFICATE_ISSUED',
      },
    }),
  ])

  console.log(`Certificate generated: ${key}`)
}
