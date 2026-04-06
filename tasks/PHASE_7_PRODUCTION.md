# Phase 7 — Production Hardening ✅ CORE COMPLETE

> Read `tasks/CONTEXT.md` first. Start after Phase 6 is done.

## Completed

### Security
- [ ] Rate limiting: `lib/rateLimit.ts` — Upstash Redis sliding window, apply to auth + payment routes
- [ ] Zod validation: audit all Route Handlers — every POST/PUT must validate body
- [ ] CSRF: verify `Origin` header matches `NEXT_PUBLIC_APP_URL` on state-mutating routes
- [ ] File upload MIME validation: reject non-allowed types in presigned URL route
- [ ] `x-institute-id` header forgery check in middleware (must match JWT payload instituteId)
- [ ] Input sanitization: strip HTML from all user-submitted text fields

### Testing
- [ ] Unit: `lib/jwt.ts` — sign + verify
- [ ] Unit: quiz scoring logic
- [ ] Integration: payment + enrollment flow (test Razorpay keys)
- [ ] E2E: student learning flow (Playwright)

### Monitoring
- [ ] `@sentry/nextjs` — add to `next.config.ts`, set `SENTRY_DSN`
- [ ] Pino structured logging — add to Route Handlers for request/response logging
- [ ] BetterUptime monitor on `/api/health`

### EC2 Deployment
- [ ] `ecosystem.config.js` — PM2 config (ledxElearn-app, ledxElearn-worker, ledxElearn-ai)
- [ ] Nginx config — wildcard `*.lexed.in` → port 3000
- [ ] Certbot wildcard SSL
- [ ] GitHub Actions deploy workflow (SSH + `pm2 reload`)
- [ ] Cloudflare DNS A records

---

## Done Criteria

- [ ] Rate limiting blocks brute force on `/api/auth/login`
- [ ] Sentry captures errors in production
- [ ] All E2E tests pass
- [ ] PM2 processes stay up on EC2 after reboot
- [ ] Wildcard SSL works for all subdomains

---

## Last Worked On
Not started yet.
