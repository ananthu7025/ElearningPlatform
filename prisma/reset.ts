/**
 * DB Reset Script
 * Wipes all data in FK-safe order, then re-seeds.
 *
 * Usage:
 *   npm run db:reset
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

async function main() {
  console.log('⚠️  Resetting database — all data will be deleted...\n')

  // ── Delete in FK-safe order (leaves before roots) ─────────────────────────

  await prisma.quizAttempt.deleteMany()
  console.log('  ✓ QuizAttempts')

  await prisma.assignmentSubmission.deleteMany()
  console.log('  ✓ AssignmentSubmissions')

  await prisma.practiceSubmission.deleteMany()
  console.log('  ✓ PracticeSubmissions')

  await prisma.lessonProgress.deleteMany()
  console.log('  ✓ LessonProgress')

  await prisma.enrollment.deleteMany()
  console.log('  ✓ Enrollments')

  await prisma.payment.deleteMany()
  console.log('  ✓ Payments')

  await prisma.notification.deleteMany()
  console.log('  ✓ Notifications')

  await prisma.doubt.deleteMany()
  console.log('  ✓ Doubts')

  await prisma.subscriptionPayment.deleteMany()
  console.log('  ✓ SubscriptionPayments')

  await prisma.liveClass.deleteMany()
  console.log('  ✓ LiveClasses')

  await prisma.announcement.deleteMany()
  console.log('  ✓ Announcements')

  await prisma.practiceScenario.deleteMany()
  console.log('  ✓ PracticeScenarios')

  await prisma.quizQuestion.deleteMany()
  console.log('  ✓ QuizQuestions')

  await prisma.quiz.deleteMany()
  console.log('  ✓ Quizzes')

  await prisma.assignment.deleteMany()
  console.log('  ✓ Assignments')

  await prisma.lesson.deleteMany()
  console.log('  ✓ Lessons')

  await prisma.module.deleteMany()
  console.log('  ✓ Modules')

  await prisma.course.deleteMany()
  console.log('  ✓ Courses')

  await prisma.coupon.deleteMany()
  console.log('  ✓ Coupons')

  await prisma.user.deleteMany()
  console.log('  ✓ Users')

  await prisma.institute.deleteMany()
  console.log('  ✓ Institutes')

  await prisma.plan.deleteMany()
  console.log('  ✓ Plans')

  console.log('\n✅ Database cleared\n')

  // ── Re-seed ────────────────────────────────────────────────────────────────
  console.log('🌱 Running seed...\n')
  execSync('npx prisma db seed', { stdio: 'inherit' })
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
