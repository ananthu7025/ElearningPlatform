# Phase 2 — Super Admin ✅ COMPLETE

> Read `tasks/CONTEXT.md` first. Start this only after Phase 1 is fully done.

## Goal
Complete Super Admin section end-to-end: layout, sidebar, dashboard, institutes, plans, billing — all wired to real API.

---

## Task Checklist

### Layout & Navigation
- [x] `hooks/useMenu.ts` — copy from `ledx/hooks/useMenu.ts` (already clean, no changes needed)
- [x] `components/layouts/SuperAdminSidebar.tsx` — migrate from ledx (already uses navItems array — good pattern, keep it)
- [x] `components/layouts/SuperAdminLayout.tsx` — migrate + optimize from ledx (see notes below)
- [x] `app/(super-admin)/layout.tsx` — wrap children in `<SuperAdminLayout>`

### API Routes
- [x] `app/api/super/analytics/route.ts` — GET platform stats
- [x] `app/api/super/institutes/route.ts` — GET list, POST create
- [x] `app/api/super/institutes/[id]/route.ts` — GET one, PUT update
- [x] `app/api/super/institutes/[id]/status/route.ts` — PUT approve/suspend
- [x] `app/api/super/plans/route.ts` — GET list, POST create
- [x] `app/api/super/plans/[id]/route.ts` — PUT update, DELETE
- [x] `app/api/super/billing/route.ts` — GET SubscriptionPayment records

### Pages
- [x] `app/(super-admin)/dashboard/page.tsx` — stat cards + charts
- [x] `app/(super-admin)/institutes/page.tsx` — institute list + approve/suspend/delete + **Export CSV** (downloads current filtered view)
- [x] `app/(super-admin)/institutes/[id]/page.tsx` — institute detail: header, stat cards, Details/Billing tabs, **Edit offcanvas** (name/plan/phone/region), delete modal
- [x] `app/(super-admin)/plans/page.tsx` — plan list + create/edit modal with **checkbox feature grid** (grouped by category, select-all per category)
- [x] `app/(super-admin)/billing/page.tsx` — SubscriptionPayment table

---

## Post-Build Fixes & Improvements

### Institute Detail Page (added this session)
- Created `app/(super-admin)/super-admin/institutes/[id]/page.tsx` — was missing, /[id] route was 404
- `GET /api/super/institutes/[id]` updated to return `adminName`, `adminEmail`, `revenue` (same shape as list)
- `PUT /api/super/institutes/[id]` schema extended with `phone` and `region` fields
- **Billing tab** fetches `GET /api/super/billing?instituteId=:id` — shows per-institute payment history inline
- `GET /api/super/billing` updated to support `instituteId` query param filter
- List page dropdown: removed "Manage Plan", "Edit Details" → links to detail page, "View Billing" → links to `[id]?tab=billing`

### Plan Feature Gating (added this session)
- `lib/planFeatures.ts` — **canonical feature keys** (`course_builder`, `live_classes`, `practice_lab`, etc.) with labels + `FEATURE_CATEGORIES` for UI grouping. **Always use keys from here, never raw strings.**
- `lib/planGate.ts` — `requireFeature(instituteId, key)` throws `FEATURE_LOCKED:key` (caught by `handleRouteError` → 403), `checkStudentLimit / checkCourseLimit / checkTutorLimit` return `{ allowed, current, max, message }`
- `lib/errors.ts` — handles `FEATURE_LOCKED:*` thrown errors
- **Gated routes:**
  - `POST /api/courses` — blocks if `count(courses) >= plan.maxCourses`
  - `POST /api/admin/tutors` — blocks if `count(tutors) >= plan.maxTutors`
  - `POST /api/admin/students` — blocks if `count(students) >= plan.maxStudents`
  - `POST /api/live-classes` — requires `live_classes` feature
  - `GET /api/practice-lab/scenarios` — requires `practice_lab` feature
- `prisma/seed.ts` — updated all plan `features` arrays to use machine-readable keys
- Plans page UI replaced textarea ("one per line") with scrollable **checkbox grid** grouped by category with indeterminate select-all per category. Edit button added to each plan card.

---

## Last Worked On
Institute detail page, billing tab, edit offcanvas, Export CSV, plan feature gating system.
