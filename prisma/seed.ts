import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Plans ──────────────────────────────────────────────────────────────────
  const starter = await prisma.plan.upsert({
    where: { name: 'Starter' },
    update: {},
    create: {
      name: 'Starter',
      maxStudents: 200,
      maxCourses: 5,
      maxTutors: 3,
      priceMonthly: 999,
      features: ['course_builder', 'quizzes', 'assignments', 'certificates', 'student_invite', 'tutor_management', 'basic_analytics'],
    },
  })

  const growth = await prisma.plan.upsert({
    where: { name: 'Growth' },
    update: {},
    create: {
      name: 'Growth',
      maxStudents: 1000,
      maxCourses: 20,
      maxTutors: 10,
      priceMonthly: 2999,
      features: ['course_builder', 'quizzes', 'assignments', 'certificates', 'student_invite', 'tutor_management', 'basic_analytics', 'live_classes', 'practice_lab', 'advanced_analytics', 'coupons'],
    },
  })

  await prisma.plan.upsert({
    where: { name: 'Pro' },
    update: {},
    create: {
      name: 'Pro',
      maxStudents: 999999,
      maxCourses: 999999,
      maxTutors: 999999,
      priceMonthly: 7999,
      features: ['course_builder', 'quizzes', 'assignments', 'certificates', 'student_invite', 'tutor_management', 'basic_analytics', 'live_classes', 'practice_lab', 'advanced_analytics', 'coupons', 'lexai_tutor', 'custom_branding', 'priority_support'],
    },
  })

  console.log('✅ Plans seeded')

  // ── Super Admin ────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'superadmin@lexed.in' },
    update: {},
    create: {
      email: 'superadmin@lexed.in',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      instituteId: null,
    },
  })

  console.log('✅ Super admin seeded')

  // ── Demo Institute ─────────────────────────────────────────────────────────
  const demoInstitute = await prisma.institute.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Law Academy',
      subdomain: 'demo',
      planId: growth.id,
      status: 'ACTIVE',
      primaryColor: '#7367F0',
    },
  })

  console.log('✅ Demo institute seeded')

  // ── Institute Users ────────────────────────────────────────────────────────
  const hash = (p: string) => bcrypt.hash(p, 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.lexed.in' },
    update: {},
    create: {
      email: 'admin@demo.lexed.in',
      passwordHash: await hash('Admin@123'),
      name: 'Institute Admin',
      role: Role.ADMIN,
      instituteId: demoInstitute.id,
    },
  })

  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@demo.lexed.in' },
    update: {},
    create: {
      email: 'tutor@demo.lexed.in',
      passwordHash: await hash('Admin@123'),
      name: 'Dr. Meera Pillai',
      role: Role.TUTOR,
      instituteId: demoInstitute.id,
    },
  })

  const student = await prisma.user.upsert({
    where: { email: 'student@demo.lexed.in' },
    update: {},
    create: {
      email: 'student@demo.lexed.in',
      passwordHash: await hash('Admin@123'),
      name: 'Rahul Sharma',
      role: Role.STUDENT,
      instituteId: demoInstitute.id,
    },
  })

  console.log('✅ Institute users seeded')

  // ── Demo Course ────────────────────────────────────────────────────────────
  const course = await prisma.course.upsert({
    where: { id: 'demo-course-001' },
    update: {},
    create: {
      id: 'demo-course-001',
      instituteId: demoInstitute.id,
      tutorId: tutor.id,
      title: 'CLAT 2025 — Complete Preparation',
      description: 'A comprehensive course covering all CLAT subjects including Legal Reasoning, Logical Reasoning, English Language, Current Affairs, and Quantitative Techniques.',
      price: 4999,
      category: 'CLAT',
      status: 'PUBLISHED',
    },
  })

  const module1 = await prisma.module.upsert({
    where: { id: 'demo-module-001' },
    update: {},
    create: {
      id: 'demo-module-001',
      courseId: course.id,
      title: 'Module 1: Legal Reasoning',
      orderIndex: 1,
    },
  })

  await prisma.lesson.upsert({
    where: { id: 'demo-lesson-001' },
    update: {},
    create: {
      id: 'demo-lesson-001',
      moduleId: module1.id,
      title: 'Introduction to Legal Reasoning',
      type: 'VIDEO',
      orderIndex: 1,
      isFreePreview: true,
      durationSeconds: 900,
    },
  })

  // Enroll demo student
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    update: {},
    create: {
      studentId: student.id,
      courseId: course.id,
      amountPaid: 0,
      completionPercentage: 0,
    },
  })

  console.log('✅ Demo course and enrollment seeded')
  console.log('\n🎉 Seed complete!')
  console.log('\nDemo credentials:')
  console.log('  Super Admin : superadmin@lexed.in / Admin@123')
  console.log('  Admin       : admin@demo.lexed.in / Admin@123')
  console.log('  Tutor       : tutor@demo.lexed.in / Admin@123')
  console.log('  Student     : student@demo.lexed.in / Admin@123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
