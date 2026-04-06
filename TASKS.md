# LedxElearn — Task Board

## 🚀 Public Student Enrollment (Udemy Model)

> Allow institutes to make their platform public so students can self-register,
> browse courses, and pay — while keeping the existing admin-invite model intact.

---

### Overview

Two models coexist:

| Model | How student gets in |
|---|---|
| **Closed (current)** | Admin manually creates account + temp password |
| **Public (new)** | Student self-registers via institute's public URL |

---

### Step 1 — Schema Changes
- [ ] Add `Institute.isPublic Boolean @default(false)`
- [ ] Add `Institute.publicSlug String? @unique`
- [ ] Add `Course.isPublicEnrollable Boolean @default(true)`
- [ ] Add `Course.previewDescription String? @db.Text`
- [ ] Add `User.emailVerified Boolean @default(false)`
- [ ] Run `npx prisma db push`

---

### Step 2 — Public API Routes

- [ ] `GET  /api/public/[slug]` — Institute info (name, logo, isPublic check)
- [ ] `GET  /api/public/[slug]/courses` — Published + enrollable courses (no auth)
- [ ] `GET  /api/public/[slug]/courses/[courseId]` — Course detail + free preview lessons
- [ ] `POST /api/public/[slug]/register` — Self-register student (name, email, password)

---

### Step 3 — Middleware Update
- [ ] Whitelist `/[slug]/*` paths from auth middleware
- [ ] Whitelist `/api/public/*` from auth middleware
- [ ] Inject `instituteId` from slug lookup for public API routes

---

### Step 4 — Public Pages (no auth required)

- [ ] `/[slug]` — Institute landing page (hero, featured courses, stats)
- [ ] `/[slug]/courses` — Browse all public courses (search, filter by category)
- [ ] `/[slug]/courses/[courseId]` — Course detail (description, curriculum, price, enroll CTA)
- [ ] `/[slug]/register` — Self-registration form
- [ ] `/[slug]/login` — Login scoped to institute (or reuse `/login` with slug context)

---

### Step 5 — Admin Settings (toggle public mode)

- [ ] Add "Public Enrollment" section to `/admin/settings`
  - Toggle on/off `isPublic`
  - Set/edit `publicSlug`
  - Preview public URL
- [ ] Add per-course toggle `isPublicEnrollable` in course settings

---

### Step 6 — Wire Invite Email for Admin-Created Students
> Currently there's a `TODO` comment in the students API — temp password is only logged to console.

- [ ] Add `sendStudentInviteEmail()` to `lib/email.ts`
- [ ] Call it in `POST /api/admin/students` after user creation

---

### Step 7 — Optional: Email Verification
- [ ] Send verification email on self-registration
- [ ] `GET /api/auth/verify-email?token=...` route
- [ ] Gate course access on `emailVerified` (configurable per institute)

---

## Full Student Journey (Public Model)

```
1. Student visits:   lexed.in/sharma-law   (Institute public URL)
        ↓
2. Institute landing page — hero, featured courses (no login needed)
        ↓
3. Browses courses → clicks a course
        ↓
4. Course detail page — description, curriculum preview, price
        ↓
5. Clicks "Enroll Now"
   → If not logged in → /[slug]/register
        ↓
6. Self-registration: Name, Email, Password
   → POST /api/public/[slug]/register
   → User created { role: STUDENT, instituteId }
   → JWT cookie set
        ↓
7. Redirected back to course → Razorpay payment modal
        ↓
8. POST /api/payments/create-order  →  Razorpay order
   POST /api/payments/verify        →  Enrollment created
        ↓
9. Redirect to /learn/[firstLessonId]
   → Student is now inside the existing student dashboard ✅
```

---

## Build Order

| Priority | Step | Effort |
|---|---|---|
| 1 | Schema changes | Small |
| 2 | Public API routes | Small |
| 3 | Middleware whitelist | Small |
| 4 | Register page | Medium |
| 5 | Course browse + detail (public) | Medium |
| 6 | Institute landing page | Medium |
| 7 | Admin settings toggle | Small |
| 8 | Student invite email (existing model fix) | Small |
| 9 | Email verification | Medium |

---

## Notes

- The existing payment flow (`/api/payments/create-order`, `/api/payments/verify`) works unchanged
- The existing student dashboard, course player, and quiz/assignment flows work unchanged
- `user.instituteId` is already set at registration — all existing scoping logic continues to work
- Free courses (`price = 0`) skip Razorpay and enroll directly (already handled in current code)
