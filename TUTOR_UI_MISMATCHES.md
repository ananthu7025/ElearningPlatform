# Tutor Pages — UI Mismatches (ledx vs ledxElearn)

> **Legend**
> - 🔴 Missing entirely
> - 🟡 Partially implemented / simplified
> - 🟢 Matches reference

---

## 1. Dashboard (`/tutor/dashboard`)

| Element | ledx (reference) | ledxElearn (current) | Gap |
|---|---|---|---|
| Hero card | Gradient card with live stats (earnings, students, rating, avg progress) | ❌ Not present | 🔴 Missing |
| Monthly Earnings chart | Bar chart (ApexCharts) | ❌ Not present | 🔴 Missing |
| Student Status split card | Left: % active + progress bar; Right: Active/Inactive/Completed counts | ❌ Not present | 🔴 Missing |
| Engagement Reports | Weekly bar chart + stat numbers | ❌ Not present | 🔴 Missing |
| Course Tracker | Radial progress chart | ❌ Not present | 🔴 Missing |
| Top Courses list | Course list with thumbnails + progress bars | ❌ Not present | 🔴 Missing |
| Completion Health | Sparkline chart | ❌ Not present | 🔴 Missing |
| Course Categories | Category list with percentages | ❌ Not present | 🔴 Missing |
| Quick Actions | 6-button action grid (Add Lesson, Schedule Class, etc.) | ❌ Not present | 🔴 Missing |
| Recent Activity table | Table: student name, action, course, time | ❌ Not present | 🔴 Missing |
| Stat cards | 4 basic stat cards | ✅ Present | 🟢 Match |
| Pending Doubts | Simple list | 🟡 Present (minimal) | 🟡 Partial |
| Upcoming Live Classes | Simple list | 🟡 Present (minimal) | 🟡 Partial |

**Summary**: ledxElearn dashboard is ~15% of the ledx reference. All charts, the hero card, Quick Actions, and all analytics widgets are missing.

---

## 2. Courses (`/tutor/courses`)

| Element | ledx (reference) | ledxElearn (current) | Gap |
|---|---|---|---|
| Hero banner | Gradient banner with illustrations, descriptive text | ❌ Not present | 🔴 Missing |
| Stat cards | Total Students / Active Courses / Avg Rating / Total Earnings | ❌ Not present | 🔴 Missing |
| Filter: status | Status dropdown (All/Draft/Published/Archived) | ❌ Not present | 🔴 Missing |
| Filter: subject | Subject/category dropdown | ❌ Not present | 🔴 Missing |
| Card/Table view toggle | Grid icon vs Table icon toggle buttons | ❌ Not present | 🔴 Missing |
| Course cards | Thumbnail image, rating stars, completion %, earnings per course | No thumbnail, no rating, no earnings, no progress | 🟡 Partial |
| Course link | Links to `/tutor/courses/[id]` | Links to `/admin/courses/[id]` (**wrong**) | 🔴 Bug |
| Real data | Fetches from API with React Query | ✅ Present | 🟢 Match |

**Summary**: Missing hero, stat cards, filters, view toggle, and course card metadata. The course link incorrectly navigates to `/admin/courses/` instead of `/tutor/courses/`.

---

## 3. Doubts (`/tutor/doubts`)

| Element | ledx (reference) | ledxElearn (current) | Gap |
|---|---|---|---|
| Stat cards | 4 cards: Pending / Answered This Week / Avg Response Time / Total This Month | ❌ Not present | 🔴 Missing |
| Filters row | Course filter + Lesson filter + Status filter + Search box | Only resolved toggle | 🟡 Partial |
| Doubt cards layout | Expandable accordion cards with student avatar, question preview, badges | Simple list-group items | 🟡 Partial |
| Expanded doubt panel | 2-col: left = full question block with quote style; right = rich text reply editor (bold/italic/underline toolbar) + Submit + Mark Resolved | Modal dialog (simpler) | 🟡 Partial |
| Reply toolbar | Bold / Italic / Underline / Link / Photo formatting buttons | Plain textarea only | 🔴 Missing |
| Save Draft button | Dedicated "Save Draft" button in expanded panel | ❌ Not present | 🔴 Missing |
| Real API data | ✅ Real API + React Query | ✅ Real API + React Query | 🟢 Match |

**Summary**: Missing stat cards and course/lesson filters. The answer UI is a basic modal instead of an inline accordion with rich-text editing.

---

## 4. Assignments (`/tutor/assignments`)

| Element | ledx (reference) | ledxElearn (current) | Gap |
|---|---|---|---|
| Stat cards | 3 cards: Pending Review / Reviewed This Week / Avg Score | ❌ Not present | 🔴 Missing |
| Filters row | Course filter + Status filter + Date picker | ❌ Not present | 🔴 Missing |
| Submission list layout | Expandable accordion cards with student, assignment title, course, submission date | Must paste assignment ID manually (bad UX) | 🟡 Partial |
| Expanded review panel | 2-col: left = assignment brief + student submission preview; right = marks input + rich text feedback + Return/Save | Modal with score + textarea | 🟡 Partial |
| Assignment brief display | Shows rubric, point breakdown, instructions | ❌ Not present | 🔴 Missing |
| Student submission preview | Rendered in a scrollable code-block style panel | Only truncated text snippet | 🟡 Partial |
| Rich feedback editor | Bold/Italic/Underline toolbar above textarea | Plain textarea | 🔴 Missing |
| Assignment discovery | Lists all assignments grouped by course | Requires pasting assignment ID manually | 🔴 Poor UX |

**Summary**: Missing stat cards, filters, and the assignment-discovery flow. Reviewing a submission requires pasting an ID, while ledx shows all pending submissions grouped by course automatically.

---

## 5. Live Classes (`/tutor/live-classes`)

| Element | ledx (reference) | ledxElearn (current) | Gap |
|---|---|---|---|
| Stat cards | 4 cards: Scheduled / Live Now / Upcoming / Completed | ❌ Not present | 🔴 Missing |
| Filter toolbar | Course filter + Status filter + Search input | ❌ Not present | 🔴 Missing |
| Card / Calendar view toggle | Toggle between cards view and month calendar view | ❌ Not present | 🔴 Missing |
| Live Now section | Gradient purple hero card with pulsing "Live" dot, student count, "Start Class" button | ❌ Not present | 🔴 Missing |
| Upcoming section | Card grid with color-coded course thumbnails, date/time/duration badges, Edit/Notify/Cancel actions | Simple list-group with Start + Cancel buttons | 🟡 Partial |
| Completed section | Card grid with top color bar, course badge, attended count, View Recording button | Plain table (Past Classes) | 🟡 Partial |
| Calendar view | Full 30-day grid calendar with per-day event badges and course color legend | ❌ Not present | 🔴 Missing |
| Pulsing live animation | CSS `livePulse` keyframe animation on the live dot | ❌ Not present | 🔴 Missing |
| Schedule Class | Button links to `/tutor/live-classes/schedule` | Modal form (simpler) | 🟡 Partial |
| Real API data | ✅ Present | ✅ Present | 🟢 Match |

**Summary**: Missing stat cards, toolbar, Calendar view, and the "Live Now" hero card. The class listing is a plain list instead of color-coded cards with grouped sections.

---

## 6. Students (`/tutor/students`)

| Element | ledx (reference) | ledxElearn (current) | Gap |
|---|---|---|---|
| Page exists | `/tutor/students` — full student progress page | ❌ **Page does not exist** | 🔴 Missing |
| Stat cards | Total Students / Avg Progress / Avg Quiz Score / At Risk | — | 🔴 Missing |
| Completion Overview widget | Split card: left = avg % + rating-style progress bands; right = Completed/On Track/Falling Behind/At Risk counts | — | 🔴 Missing |
| Student table | Student / Course / Lessons done / Progress bar / Quiz Avg / Last Active | — | 🔴 Missing |
| Expandable rows | Click row → shows Lesson Completion list + Quiz History bars + Tutor Notes textarea | — | 🔴 Missing |
| Course filter | Select course to scope the student list | — | 🔴 Missing |
| Sort options | Sort by Progress / Last Active / Quiz Score | — | 🔴 Missing |
| Pagination | Show N entries + page navigation | — | 🔴 Missing |

**Summary**: The entire `/tutor/students` page is absent from ledxElearn. This is a significant gap — tutors cannot monitor student progress.

---

## 7. Practice Lab (`/tutor/practice-lab`)

| Element | ledx (reference) | ledxElearn (current) | Gap |
|---|---|---|---|
| Hero banner | Gradient card with illustrations (bulb + rocket), "Author New Scenario" dropdown CTA | ❌ Not present | 🔴 Missing |
| Stat cards | My Scenarios / Published / Total Attempts / Avg Score | ❌ Not present | 🔴 Missing |
| Tabs | "My Scenarios" tab + "Student Activity" tab | No tabs — single flat list | 🟡 Partial |
| My Scenarios tab | Table: Scenario / Module / Case Type / Attempts / Avg Score / Created / Status / Actions | Not present | 🔴 Missing |
| Student Activity tab | Table: Student / Scenario / Module / Score / XP Earned / Date | Not present (only simple list) | 🟡 Partial |
| "Author New Scenario" flow | Dropdown links to `/tutor/practice-lab/[moduleId]/scenarios/new` | ❌ Not present | 🔴 Missing |
| AI score display | Shows AI score with color coding (green ≥75, yellow ≥65, red <65) | Shows score but no colour coding | 🟡 Partial |
| Grading | Grade/Override button → modal | Grade/Override button → modal | 🟢 Match |
| Real API data | Static mock data | ✅ Real API + React Query | 🟢 Match |

**Summary**: Missing hero banner, stat cards, scenario authoring flow, and the two-tab layout. The current page only shows a flat submission list with no scenario management.

---

## Priority Fix List

| Priority | Page | Key gaps |
|---|---|---|
| 1 | **Students** | Entire page missing — build from scratch |
| 2 | **Dashboard** | Add charts, hero card, Quick Actions |
| 3 | **Live Classes** | Add stat cards, Calendar view, Live Now hero |
| 4 | **Courses** | Fix broken link, add hero + stat cards + filters |
| 5 | **Assignments** | Add stat cards, auto-discover assignments |
| 6 | **Doubts** | Add stat cards, course/lesson filters, rich reply editor |
| 7 | **Practice Lab** | Add hero, stat cards, scenario authoring flow, tabs |
