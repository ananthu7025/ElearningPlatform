# Phase 6 — Notifications, Certificates & Worker ✅ COMPLETE

> Read `tasks/CONTEXT.md` first. Start after Phase 5 is done.

## Task Checklist

### BullMQ Worker
- [x] `worker/queues.ts` — queue definitions (certificate, email, embed)
- [x] `worker/jobs/certificate.ts` — pdf-lib cert generation → R2 upload → notification
- [x] `worker/jobs/email.ts` — Resend templates (5 email types)
- [x] `worker/jobs/embed.ts` — forward to Python AI service for pgvector
- [x] `worker/index.ts` — worker entry point, registers all processors
- [x] `lib/queue.ts` — helper to enqueue from Route Handlers

### Certificates
- [x] Certificate job auto-enqueued when lesson marked complete triggers 100% completion
- [x] `app/api/certificates/route.ts` — GET my certificates
- [x] `app/api/certificates/[enrollmentId]/download/route.ts` — signed R2 URL redirect

### Notifications
- [x] `app/api/notifications/route.ts` — GET
- [x] `app/api/notifications/[id]/read/route.ts` — PUT mark read
- [x] `app/api/notifications/read-all/route.ts` — PUT mark all read

---

## Manual Steps Required
- Run `npm install pdf-lib @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` (if not already installed)
- Add env vars: `REDIS_HOST`, `REDIS_PORT`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `AI_SERVICE_URL`, `AI_INTERNAL_SECRET`
- PM2 config: start `worker/index.ts` as separate process

## Last Worked On
Phase 6 complete. Moving to Phase 7 — Production.
