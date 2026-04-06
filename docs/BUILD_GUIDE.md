# ledxElearn — Build Guide

> Step-by-step guide for building the app phase by phase.
> UI already exists in `ledx/`. This guide explains how to migrate it correctly — not copy-paste, but **optimize while preserving styles**.

---

## Project Setup (Do Once)

```bash
cd ledxElearn

# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env.local

# Copy vendor assets from ledx (Bootstrap + Vuexy theme — do not modify these)
cp -r ../ledx/public/vendor ./public/vendor
cp -r ../ledx/public/css    ./public/css
cp -r ../ledx/public/img    ./public/img

# Set up Prisma
npx prisma migrate dev --name init
npx prisma db seed

# Start dev server
npm run dev
```

---

## Development Order

```
Phase 1 → Auth (login, refresh, logout, forgot/reset password)
Phase 2 → Super Admin (institutes, plans, billing, analytics)
Phase 3 → Admin (courses, curriculum, students, analytics, payments)
Phase 4 → Tutor (courses, assignments, doubts, live classes)
Phase 5 → Student (learning, quizzes, practice lab, AI tutor)
Phase 6 → Notifications, Certificates, Gamification
Phase 7 → Production hardening
```

Complete each phase end-to-end (API route + UI wired) before moving to the next.

---

## UI Migration Rules

> The `ledx/` project is the UI reference. These rules apply **every time** you copy a page or component from `ledx/` into `ledxElearn/`.

### Rule 1 — Never Paste Raw HTML Blocks

`ledx` pages often have long JSX with repeated markup. Before pasting, identify the repeated pattern and extract it.

**Bad — copied as-is from ledx:**
```tsx
// ❌ Three course cards copy-pasted
<div className="col-md-4">
  <div className="card">
    <img src="/img/courses/1.jpg" className="card-img-top" />
    <div className="card-body">
      <h5 className="card-title">CLAT 2025</h5>
      <p className="card-text text-muted">Dr. Mehta</p>
      <span className="badge bg-label-primary">CLAT</span>
    </div>
  </div>
</div>
<div className="col-md-4">
  <div className="card">
    <img src="/img/courses/2.jpg" className="card-img-top" />
    ...
  </div>
</div>
```

**Good — extracted to a typed component:**
```tsx
// ✅ components/ui/CourseCard.tsx
interface CourseCardProps {
  title: string
  tutorName: string
  category: string
  thumbnailUrl: string | null
  price: number
}

export default function CourseCard({ title, tutorName, category, thumbnailUrl, price }: CourseCardProps) {
  return (
    <div className="col-md-4">
      <div className="card">
        <img src={thumbnailUrl ?? '/img/placeholder.jpg'} className="card-img-top" alt={title} />
        <div className="card-body">
          <h5 className="card-title">{title}</h5>
          <p className="card-text text-muted">{tutorName}</p>
          <span className="badge bg-label-primary">{category}</span>
        </div>
      </div>
    </div>
  )
}

// Page usage
courses.map((c) => <CourseCard key={c.id} {...c} />)
```

---

### Rule 2 — Replace All Hardcoded Data with Props or API Calls

`ledx` pages use static arrays for everything. Replace them with real types and API data.

**Bad:**
```tsx
// ❌ Static array in the page component
const students = [
  { name: 'Rahul Sharma', email: 'rahul@test.com', enrolled: 3 },
  { name: 'Priya Singh', email: 'priya@test.com', enrolled: 1 },
]
```

**Good:**
```tsx
// ✅ Fetch from API with React Query
const { data, isLoading } = useQuery({
  queryKey: ['students'],
  queryFn: () => api.get('/students').then(r => r.data)
})
```

---

### Rule 3 — Keep All Bootstrap / Vuexy CSS Classes Exactly As-Is

Never rename, remove, or rewrite CSS classes from the Vuexy theme. The styles come from `/vendor/css/core.css` which you do not control. Changing class names breaks the UI.

```tsx
// ✅ Keep Vuexy classes unchanged
<div className="card shadow-none border border-300">
  <div className="card-header border-bottom">

// ❌ Do not "clean up" classes
<div className="card">
  <div className="card-header">
```

If a class looks unused or redundant, leave it — it may be used by the Vuexy JS for animations, theme switching, or responsive behaviour.

---

### Rule 4 — Remove All Inline Styles

`ledx` sometimes uses inline `style={{}}` for things that should be CSS variables or Tailwind.

```tsx
// ❌
<div style={{ backgroundColor: '#7367F0', borderRadius: '8px' }}>

// ✅ Use Bootstrap utility classes instead
<div className="bg-primary rounded">

// ✅ Or CSS variable if it's a brand color
<div className="app-brand-logo" style={{ '--logo-bg': 'var(--bs-primary)' } as React.CSSProperties}>
```

---

### Rule 5 — Split Large Page Files

If a `ledx` page file is over 150 lines, it must be split before copying.

```
app/(admin)/courses/page.tsx            → page shell + data fetch only
components/layouts/AdminLayout.tsx      → layout wrapper
components/ui/CourseTable.tsx           → table component
components/ui/CourseFilterBar.tsx       → search + filter bar
components/forms/CourseForm.tsx         → create/edit form
```

Each file should do **one thing**.

---

### Rule 6 — Convert `useState` Chains to `useReducer` or Zustand

`ledx` modals often have multiple `useState` flags. Consolidate:

```tsx
// ❌ In ledx — multiple independent flags
const [showModal, setShowModal] = useState(false)
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
const [editingId, setEditingId] = useState(null)

// ✅ In ledxElearn — single state object or Zustand slice
const [modalState, setModalState] = useState<{
  open: boolean
  editingId: string | null
}>({ open: false, editingId: null })
```

---

### Rule 7 — All Forms Must Use React Hook Form + Zod

`ledx` uses basic `onChange` handlers. Replace with RHF + Zod schema.

```tsx
// ✅ Pattern to follow for every form
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  price: z.number().min(0),
})
type FormData = z.infer<typeof schema>

export default function CourseForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  // ...
}
```

---

### Rule 8 — Remove Dead Code

When migrating from `ledx`, actively remove:
- Commented-out JSX blocks
- `console.log` statements
- `TODO` comments that are addressed
- Unused imports
- Mock data arrays that have been replaced with API calls

---

### Rule 9 — Loading & Error States Are Mandatory

Every page that fetches data must handle loading and error states using the existing Vuexy skeleton/spinner classes.

```tsx
if (isLoading) return <div className="spinner-border text-primary" role="status" />
if (error) return <div className="alert alert-danger">{error.message}</div>
```

---

### Rule 10 — Type Everything

No `any`. Define TypeScript interfaces for every API response before writing the component. Put shared types in `types/index.ts`.

```tsx
// ❌
const [data, setData] = useState<any>(null)

// ✅
import type { Course } from '@/types'
const [courses, setCourses] = useState<Course[]>([])
```

---

## Phase 1 — Auth

### What to build

| File | What it does |
|---|---|
| `app/api/auth/login/route.ts` | Validate credentials, issue JWT, set cookie |
| `app/api/auth/refresh/route.ts` | Refresh access token from cookie |
| `app/api/auth/logout/route.ts` | Blacklist refresh token |
| `app/api/auth/forgot-password/route.ts` | Send reset email via Resend |
| `app/api/auth/reset-password/route.ts` | Validate token, update password |
| `app/(auth)/login/page.tsx` | Login page — migrated from `ledx/app/login/` |
| `app/(auth)/forgot-password/page.tsx` | Forgot password page |
| `app/(auth)/reset-password/page.tsx` | Reset password page |

### Migrating the login page from ledx

1. Open `ledx/app/login/page.tsx`
2. Identify the form fields and the submit handler
3. In `ledxElearn`, create a `LoginForm` client component:
   - Keep all Bootstrap classes exactly as-is
   - Replace `useState` with `react-hook-form`
   - Add Zod schema: `email: z.string().email()`, `password: z.string().min(6)`
   - Replace the mock submit with `api.post('/auth/login', data)`
   - On success: call `useAuthStore().setAuth(user, token)`, redirect by role
   - Show API error in the existing error `<div>` in the UI

### Route Handler pattern (follow for all auth routes)

```ts
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: body.error.message } }, { status: 422 })
  }

  const user = await prisma.user.findUnique({ where: { email: body.data.email } })
  if (!user || !(await bcrypt.compare(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, { status: 401 })
  }

  const payload = { sub: user.id, email: user.email, role: user.role, instituteId: user.instituteId }
  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  // Store refresh token in Redis
  // ...

  const res = NextResponse.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  res.cookies.set('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 })
  return res
}
```

---

## Phase 2 — Super Admin

### What to build

| File | Notes |
|---|---|
| `app/(super-admin)/layout.tsx` | Migrate `ledx/app/super-admin/layout.tsx` |
| `components/layouts/SuperAdminLayout.tsx` | Migrate `ledx/components/layouts/SuperAdminLayout.tsx` |
| `components/layouts/SuperAdminSidebar.tsx` | Migrate `ledx/components/layouts/SuperAdminSidebar.tsx` |
| `app/(super-admin)/dashboard/page.tsx` | Stats cards + charts |
| `app/(super-admin)/institutes/page.tsx` | Institute list + approve/suspend |
| `app/(super-admin)/plans/page.tsx` | Plan management |
| `app/(super-admin)/billing/page.tsx` | SubscriptionPayment records |
| `app/api/super/institutes/route.ts` | GET list, POST create |
| `app/api/super/institutes/[id]/status/route.ts` | PUT approve/suspend |
| `app/api/super/plans/route.ts` | GET list, POST create |
| `app/api/super/billing/route.ts` | GET subscription payments |
| `app/api/super/analytics/route.ts` | Platform-wide stats |

### Migrating Super Admin layout from ledx

1. Open `ledx/components/layouts/SuperAdminLayout.tsx` and `SuperAdminSidebar.tsx`
2. Copy — then apply optimization rules:
   - Extract each nav item into a typed `navItems` array instead of repeated JSX
   - Remove hardcoded institute name — read from `useAuthStore`
   - Remove any hardcoded stat numbers — leave placeholder for real API data
3. The sidebar nav items pattern to use:

```tsx
// ✅ Clean nav config — not raw JSX repeated
const navItems = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: 'ri-bar-chart-line' },
  { label: 'Institutes', href: '/super-admin/institutes', icon: 'ri-building-line' },
  { label: 'Plans', href: '/super-admin/plans', icon: 'ri-price-tag-3-line' },
  { label: 'Billing', href: '/super-admin/billing', icon: 'ri-bank-card-line' },
  { label: 'Analytics', href: '/super-admin/analytics', icon: 'ri-pie-chart-line' },
] as const

// Render
{navItems.map((item) => (
  <li key={item.href} className={`menu-item ${pathname === item.href ? 'active' : ''}`}>
    <Link href={item.href} className="menu-link">
      <i className={`menu-icon tf-icons ${item.icon}`} />
      <span>{item.label}</span>
    </Link>
  </li>
))}
```

### Super Admin API route pattern

```ts
// app/api/super/institutes/route.ts
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireRole('SUPER_ADMIN')
  const institutes = await prisma.institute.findMany({
    include: { plan: true, _count: { select: { users: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ institutes })
}
```

---

## Phase 3 — Admin

### Migrate order within Admin phase

1. Layout + Sidebar
2. Dashboard page (stat cards first — wire to `/api/analytics/dashboard`)
3. Courses list + create course form
4. Curriculum builder (modules + lessons drag-drop)
5. Students management
6. Tutors management
7. Payments + Coupons
8. Live Classes
9. Analytics (charts)
10. Announcements

### Key optimization: Admin Sidebar

Same nav-items array pattern as Super Admin. Admin has more items — group them:

```tsx
const navGroups = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: 'ri-dashboard-line' },
      { label: 'Courses', href: '/admin/courses', icon: 'ri-book-line' },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Students', href: '/admin/students', icon: 'ri-group-line' },
      { label: 'Tutors', href: '/admin/tutors', icon: 'ri-user-star-line' },
    ],
  },
  // ...
]
```

---

## Phase 4 — Tutor

Same migration pattern. Tutor sees only their own courses — ensure every API route filters by `tutorId = req.user.userId`.

---

## Phase 5 — Student

Most complex phase. Key points:
- The lesson player page (`/learn/[lessonId]`) should conditionally render `<MuxPlayer>`, PDF viewer, quiz, or assignment based on `lesson.type`
- Signed URL must be fetched on the client just before playback — not during SSR
- Quiz state machine: `idle → answering → submitted → results` — use `useReducer`

---

## Component File Conventions

```
components/
├── ui/                         # Reusable dumb components
│   ├── CourseCard.tsx
│   ├── StatCard.tsx            # Dashboard stat card
│   ├── DataTable.tsx           # Generic sortable table
│   ├── Badge.tsx               # Status badges
│   ├── Modal.tsx               # Bootstrap modal wrapper
│   ├── Spinner.tsx             # Loading spinner
│   └── EmptyState.tsx          # Empty list illustration
│
├── forms/                      # Form components (all use RHF + Zod)
│   ├── CourseForm.tsx
│   ├── LessonForm.tsx
│   ├── QuizForm.tsx
│   └── UserForm.tsx
│
├── charts/                     # ApexCharts wrappers
│   ├── RevenueChart.tsx
│   └── EnrollmentChart.tsx
│
└── layouts/                    # Role-based layout shells
    ├── AdminLayout.tsx
    ├── AdminSidebar.tsx
    ├── TutorLayout.tsx
    ├── TutorSidebar.tsx
    ├── StudentLayout.tsx
    ├── StudentSidebar.tsx
    ├── SuperAdminLayout.tsx
    └── SuperAdminSidebar.tsx
```

---

## API Route File Conventions

```
app/api/
├── health/route.ts             → GET /api/health
├── auth/
│   ├── login/route.ts          → POST /api/auth/login
│   ├── refresh/route.ts        → POST /api/auth/refresh
│   ├── logout/route.ts         → POST /api/auth/logout
│   ├── forgot-password/route.ts
│   └── reset-password/route.ts
├── courses/
│   ├── route.ts                → GET (list), POST (create)
│   └── [id]/
│       ├── route.ts            → GET, PUT, DELETE
│       ├── publish/route.ts    → POST
│       ├── curriculum/route.ts → GET
│       └── modules/route.ts    → POST
...
```

Every route file exports only the HTTP methods it handles (`GET`, `POST`, `PUT`, `DELETE`). No default exports in route files.

---

## Error Response Convention

All Route Handlers return errors in this shape:

```ts
// lib/errors.ts
import { NextResponse } from 'next/server'

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

// Usage in route handlers
catch (e) {
  if (e.message === 'UNAUTHORIZED') return errorResponse('UNAUTHORIZED', 'Not authenticated', 401)
  if (e.message === 'FORBIDDEN')    return errorResponse('FORBIDDEN', 'Insufficient role', 403)
  return errorResponse('INTERNAL_ERROR', 'Something went wrong', 500)
}
```
