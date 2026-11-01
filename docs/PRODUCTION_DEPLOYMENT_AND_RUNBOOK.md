# GOLA CYBERAI — PRODUCTION DEPLOYMENT & INCIDENT RESPONSE RUNBOOK
**Document Version:** 1.0.0-PROD  
**Classification:** Internal Confidential / Security Operations  
**Platform:** Gola CyberAI Enterprise Employee Management & Real-Time Collaboration  

---

## 1. Executive Summary & Architecture Overview

Gola CyberAI is an enterprise-grade internal operations suite providing attendance telemetry, project tracking, timesheet approval hierarchies, encrypted messaging, video conferencing, and automated compliance.

### Component Topology
```
                          [ Internet / Enterprise VPN ]
                                       │
                                [ TLS 1.3 / HTTPS ]
                                       │
                      ┌────────────────┴────────────────┐
                      │    Reverse Proxy / Cloudflare   │
                      └────────────────┬────────────────┘
                                       │
              ┌────────────────────────┴────────────────────────┐
              │                                                 │
      [ Port 3000 ]                                     [ Port 5000 ]
┌───────────────────────────┐                     ┌───────────────────────────┐
│ Next.js 13 App Router     │ ◄─── REST / WS ───► │ Node.js Express Backend   │
│ Client-side SPA + SSR     │                     │ WebSocket Engine (ws)     │
│ Tailwind CSS Design System│                     │ Sliding-Window Rate Limit │
└───────────────────────────┘                     └─────────────┬─────────────┘
                                                                │
                                                      [ Service Role / RLS ]
                                                                │
                                                  ┌─────────────┴─────────────┐
                                                  │ PostgreSQL (Supabase)     │
                                                  │ Encrypted at Rest (AES-256)
                                                  └───────────────────────────┘
```

---

## 2. Security Audit & Hardening Matrix

| Security Domain | Mitigation / Control Implemented | Status |
| :--- | :--- | :--- |
| **Authentication & Sessions** | JWT Bearer tokens + secure HTTP-only SameSite=Lax session cookies. | **VERIFIED** |
| **Role-Based Access (RBAC)** | Role guards enforcing `employee`, `manager`, `hr`, `payroll`, `admin` access boundaries. Non-authorized calls return `403 Forbidden`. | **VERIFIED** |
| **Cross-User Data Isolation** | Employees cannot view or edit peer compensation or confidential dossier fields. | **VERIFIED** |
| **SQL Injection & XSS** | Parameterized SQL queries via Supabase client; automated input sanitization stripping `<script>`, `javascript:`, and inline handlers. | **VERIFIED** |
| **CSRF & Security Headers** | OWASP compliant headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Content-Security-Policy`. | **VERIFIED** |
| **Rate Limiting** | Sliding window rate limiter: 10 req/min on `/api/auth`, 120 req/min on `/api`. Throttled calls receive `429 Too Many Requests` with `Retry-After`. | **VERIFIED** |
| **WebSocket Guards** | Connection requires authenticated `userId`. Room subscriptions verify conversation membership before accepting subscription or message broadcast. | **VERIFIED** |
| **Audit Log Integrity** | Structured JSON audit logger tracking security events; passwords, tokens, and secrets are stripped prior to persistence. | **VERIFIED** |

---

## 3. Automated Test Verification Report

All 34 automated unit and integration tests across 7 comprehensive test suites were executed and verified:

```
TAP version 13
# Subtest: Phase 2 — Attendance & Working Hours Calculations
  ok 1 - should format total seconds into HH:MM:SS format
  ok 2 - should accurately compute net working seconds excluding break intervals
  ok 3 - should enforce proper attendance state transitions
ok 1 - Phase 2 — Attendance & Working Hours Calculations (3 tests)

# Subtest: Real-Time Chat, Channels, Meetings & Notifications
  ok 1 - 1. Security: Conversation Membership Authorization Guard
  ok 2 - 2. Message Threading: Reply references parent message accurately
  ok 3 - 3. Reaction Toggle Logic: Supports multiple users and toggle-off
  ok 4 - 4. Meeting Schedule Validation: End time must strictly follow start time
  ok 5 - 5. In-App Notifications: Mentions generate immediate unread notifications
ok 2 - Real-Time Chat, Channels, Meetings & Notifications (5 tests)

# Subtest: Phase 3 — Employee & HR Module
  ok 1 - should validate unique employee ID format matching corporate GCA-xxxx syntax
  ok 2 - should enforce role-based field restrictions for regular employees
  ok 3 - should calculate duration correctly for full-day and half-day leaves
  ok 4 - should reject requests where end date precedes start date
  ok 5 - should accurately calculate net available leave balance
  ok 6 - should compute net salary mathematically: Gross - (PF + PT + TDS)
  ok 7 - should classify personal letters vs corporate compliance policies
ok 3 - Phase 3 — Employee & HR Module (7 tests)

# Subtest: Gola CyberAI Navigation System
  ok 1 - should have exactly 15 primary navigation items in the master prompt order
  ok 2 - should restrict Employee role from administrative HR & Settings routes
  ok 3 - should grant Administrator role access to all routes and submenus
  ok 4 - should grant Manager role access to team leave approvals but not admin settings
ok 4 - Gola CyberAI Navigation System (4 tests)

# Subtest: Project Management, Timers and Timesheets Logic
  ok 1 - 1. Timer Conflict Prevention: Only 1 active timer allowed per user
  ok 2 - 2. Authoritative Server Elapsed Seconds Calculation with Pauses
  ok 3 - 3. Auto-log Time Entry to Timesheet on Timer Stop
  ok 4 - 4. Task Status Transitions & Project Progress Recalculation
  ok 5 - 5. Timesheet Approval Workflow Integrity
  ok 6 - 6. Planning Accuracy & Hours Variance Metric Calculation
ok 5 - Project Management, Timers and Timesheets Logic (6 tests)

# Subtest: Production Security, RBAC & Defense-in-Depth Audit
  ok 1 - 1. Role-Based Access Control (RBAC) Permissions Matrix
  ok 2 - 2. Rate Limiting Sliding Window Enforcement (Brute Force Protection)
  ok 3 - 3. Cross-User Data Isolation: Employee cannot view/tamper another employee dossier
  ok 4 - 4. SQL Injection and XSS Payload Sanitization
  ok 5 - 5. WebSocket Channel Membership Authorization Guard
  ok 6 - 6. Audit Log Integrity: Sensitive tokens and passwords are never logged
ok 6 - Production Security, RBAC & Defense-in-Depth Audit (6 tests)

# Subtest: Shared Components Architecture — Design System & Tokens
  ok 1 - should define consistent color tokens for all four system roles
  ok 2 - should verify StatCard tones map to semantic design tokens
  ok 3 - should support attendance status badges for working, break, completed, and absent states
ok 7 - Shared Components Architecture — Design System & Tokens (3 tests)

TOTAL: 34 tests, 7 suites, 0 failures, 0 skipped.
```

---

## 4. Database Backup & Restore Procedures

### Automated Database Backup Script (`scripts/backup_database.sh`)
```bash
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/gola_database"
BACKUP_FILE="${BACKUP_DIR}/gola_prod_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting Gola CyberAI production database snapshot..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=plain \
  --no-owner \
  --no-privileges | gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup completed: ${BACKUP_FILE}"

# Encrypt backup using GPG
gpg --symmetric --cipher-algo AES256 --batch --yes --passphrase "${BACKUP_ENCRYPTION_KEY}" "${BACKUP_FILE}"
rm "${BACKUP_FILE}"

# Retention: Purge local snapshots older than 30 days
find "${BACKUP_DIR}" -type f -name "*.gpg" -mtime +30 -delete
```

### Database Restoration Verification Protocol
To verify disaster recovery readiness without impacting production:
1. Provision isolated staging database: `gola_restore_test`.
2. Decrypt backup archive:
   ```bash
   gpg --decrypt --batch --yes --passphrase "${BACKUP_ENCRYPTION_KEY}" gola_prod_snapshot.sql.gz.gpg | gunzip > restore.sql
   ```
3. Execute restore into test instance:
   ```bash
   psql -h staging-db -U postgres -d gola_restore_test -f restore.sql
   ```
4. Run row integrity check:
   ```sql
   SELECT 'profiles' AS tbl, count(*) FROM profiles
   UNION ALL
   SELECT 'attendance_sessions', count(*) FROM attendance_sessions
   UNION ALL
   SELECT 'projects', count(*) FROM projects
   UNION ALL
   SELECT 'tasks', count(*) FROM tasks
   UNION ALL
   SELECT 'messages', count(*) FROM messages;
   ```

---

## 5. Containerized Production Deployment

### Quick Start via Docker Compose
```bash
# 1. Clone repository on production node
git clone https://github.com/organization/gola-cyberai.git /opt/gola
cd /opt/gola

# 2. Configure production environment
cp .env.example .env
nano .env # Populate database connection strings & production domain

# 3. Build and launch multi-container stack in detached mode
docker-compose up -d --build

# 4. Verify container health status
docker-compose ps
curl -i http://localhost:5000/api/health
```

---

## 6. Pre-Flight Production Release Checklist

- [x] All 34 automated unit and security tests passing.
- [x] TypeScript compilation (`npm run build` backend & `npm run typecheck` frontend) completes with 0 errors.
- [x] Environment variable template `.env.example` created without hardcoded secrets.
- [x] Rate limiting active: 10 req/min on `/api/auth`, 120 req/min on `/api`.
- [x] OWASP security headers verified live (`X-Frame-Options`, `Content-Security-Policy`, `HSTS`).
- [x] WebSocket channel membership verification confirmed.
- [x] Non-root user execution configured in Dockerfiles (`node` for backend, `nextjs` for frontend).
- [x] Database migrations consolidated in `setup_complete_database.sql`.
- [x] Health check endpoints responding with HTTP 200.

---

## 7. Rollback Plan & Recovery Protocol

If any critical anomaly, high error rate (> 1%), or security event is observed following a deployment:

1. **Immediate Traffic Divert**:
   Reroute traffic at the load balancer / reverse proxy back to the previous stable release container tag (`gola-backend:v1.0.0-stable`, `gola-frontend:v1.0.0-stable`).
2. **Container Rollback Command**:
   ```bash
   docker-compose down
   docker tag gola-backend:previous-stable gola-backend:latest
   docker tag gola-frontend:previous-stable gola-frontend:latest
   docker-compose up -d
   ```
3. **Database Schema Rollback**:
   If a migration must be reverted, execute the corresponding down migration script or restore from the pre-deployment snapshot created immediately prior to cutover.

---

## 8. Incident Response Runbook

### Severity Classification Matrix
- **SEV-1 (Critical)**: Platform unavailable, database corruption, active credential compromise, or unauthorized cross-tenant data breach. (SLA: 15 mins triage, 1 hour mitigation).
- **SEV-2 (High)**: Core workflow degraded (e.g. attendance clock-in failing, WebSocket disconnects impacting war room). (SLA: 30 mins triage, 4 hours mitigation).
- **SEV-3 (Medium)**: Non-blocking feature issue (e.g. export PDF generation timeout, avatar upload failure). (SLA: 2 business hours).
- **SEV-4 (Low)**: Cosmetic issue or minor UI alignment anomaly.

### Incident Command Protocol
1. **Identify & Isolate**: Identify affected services using Prometheus metrics and structured audit logs (`[AUDIT]` entries in console).
2. **Containment**: If active exploit is detected, apply IP ban via Nginx/Cloudflare or revoke compromised session tokens via Supabase Auth Admin.
3. **Eradication & Fix**: Deploy hotfix or execute rollback plan.
4. **Post-Mortem**: Publish a root-cause analysis (RCA) document within 48 hours containing timeline, impact assessment, and preventative actions.
