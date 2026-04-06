# Phase 5 — Student ✅ COMPLETE

> Read `tasks/CONTEXT.md` first. Start after Phase 4 is done.

## Task Checklist

### Layout
- [x] `components/layouts/StudentLayout.tsx`
- [x] `components/layouts/StudentNavbar.tsx`
- [x] `app/(student)/layout.tsx`

### API Routes
- [x] `app/api/enrollments/me/route.ts`
- [x] `app/api/enrollments/[courseId]/progress/route.ts`
- [x] `app/api/progress/route.ts` — POST mark lesson complete
- [x] `app/api/lessons/[id]/route.ts` — GET (student view, enrollment check)
- [x] `app/api/doubts/route.ts` — POST ask doubt (student)
- [x] `app/api/practice-lab/scenarios/route.ts`
- [x] `app/api/practice-lab/scenarios/[id]/route.ts`
- [x] `app/api/practice-lab/submissions/route.ts` — POST submit
- [x] `app/api/practice-lab/submissions/[id]/route.ts` — GET (poll result)
- [x] `app/api/ai/chat/route.ts` — SSE proxy to Python service
- [x] `app/api/certificates/route.ts`
- [x] `app/api/notifications/route.ts`
- [x] `app/api/notifications/[id]/read/route.ts`
- [x] `app/api/notifications/read-all/route.ts`

### Pages
- [x] `app/(student)/dashboard/page.tsx`
- [x] `app/(student)/courses/page.tsx` — my learning
- [x] `app/(student)/courses/browse/page.tsx` — catalog
- [x] `app/(student)/courses/[id]/page.tsx` — course detail + curriculum
- [x] `app/(student)/learn/[lessonId]/page.tsx` — lesson player
- [x] `app/(student)/practice-lab/page.tsx`
- [x] `app/(student)/practice-lab/[scenarioId]/page.tsx`
- [x] `app/(student)/ai-tutor/page.tsx`
- [x] `app/(student)/certificates/page.tsx`

---

## Remaining (Phase 6)
- Quiz engine + API routes
- Assignment file upload flow
- Certificate PDF generation worker

## Last Worked On
Phase 5 core complete. Moving to Phase 6 — Notifications + Certificates.
