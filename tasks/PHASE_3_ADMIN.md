# Phase 3 — Admin ✅ COMPLETE

> Read `tasks/CONTEXT.md` first. Start after Phase 2 is done.

## Goal
Complete Admin section: layout, course management, curriculum builder, student/tutor management, payments, analytics.

---

## Task Checklist

### Layout
- [x] `components/layouts/AdminLayout.tsx`
- [x] `components/layouts/AdminNavbar.tsx`
- [x] `components/layouts/AdminSidebar.tsx`
- [x] `app/(admin)/layout.tsx`

### API Routes
- [x] `app/api/courses/route.ts` — GET list, POST create
- [x] `app/api/courses/[id]/route.ts` — GET, PUT, DELETE
- [x] `app/api/courses/[id]/publish/route.ts` — POST toggle
- [x] `app/api/courses/[id]/curriculum/route.ts` — GET
- [x] `app/api/courses/[id]/modules/route.ts` — POST add module
- [x] `app/api/courses/[id]/modules/reorder/route.ts` — PUT drag-drop order
- [x] `app/api/modules/[id]/lessons/route.ts` — POST add lesson
- [x] `app/api/modules/[id]/lessons/reorder/route.ts` — PUT
- [x] `app/api/lessons/[id]/route.ts` — PUT update, DELETE
- [x] `app/api/upload/presigned/route.ts` — POST get R2 pre-signed URL
- [x] `app/api/upload/video/route.ts` — POST get Mux upload URL (now accepts `lessonId` passthrough)
- [x] `app/api/webhooks/mux/route.ts` — POST Mux webhook (handles `video.upload.asset_created` + `video.asset.ready`)
- [x] `app/api/lessons/[id]/quiz/route.ts` — GET fetch quiz+questions, POST create quiz+questions, PUT replace quiz+questions
- [x] `app/api/modules/[id]/route.ts` — PUT edit module title, DELETE module
- [x] `app/api/courses/[id]/students/route.ts` — GET enrolled students with progress
- [x] `app/api/webhooks/razorpay/route.ts` — POST Razorpay webhook
- [x] `app/api/payments/create-order/route.ts` — POST Razorpay order
- [x] `app/api/payments/verify/route.ts` — POST verify signature
- [x] `app/api/coupons/route.ts` — GET list, POST create
- [x] `app/api/coupons/validate/route.ts` — GET validate code
- [x] `app/api/analytics/dashboard/route.ts`
- [x] `app/api/analytics/revenue/route.ts`
- [x] `app/api/admin/students/route.ts` — GET list, POST invite
- [x] `app/api/admin/tutors/route.ts` — GET list, POST create
- [x] `app/api/admin/payments/route.ts` — GET institute payments
- [x] `app/api/announcements/route.ts` — GET list, POST create

### Pages
- [x] `app/(admin)/dashboard/page.tsx`
- [x] `app/(admin)/courses/page.tsx`
- [x] `app/(admin)/courses/[id]/page.tsx` — course detail (Students / Analytics / Settings tabs + sidebar accordion)
- [x] `app/(admin)/courses/[id]/curriculum/page.tsx` — full curriculum editor (module CRUD, lesson CRUD, video upload → Mux, PDF upload → R2, quiz builder → DB)
- [x] `app/(admin)/courses/create/page.tsx` — create course page (replaces modal)
- [x] `app/(admin)/students/page.tsx`
- [x] `app/(admin)/tutors/page.tsx`
- [x] `app/(admin)/payments/page.tsx`
- [x] `app/(admin)/coupons/page.tsx`
- [x] `app/(admin)/analytics/page.tsx`

---

## Last Worked On
Phase 3 complete. Moving to Phase 4 — Tutor.
