# Kitting Timer + Waiting-Time Analytics + Advanced Analytics — Implementation Plan

**Status:** ✅ ALL PHASES COMPLETE & DEPLOYED (Docker + Vercel)
**Last updated:** 2026-04-13

---

## 1. What we built

Two major systems, all shipped and deployed:

**A. Kitting Timer Subsystem** — A dedicated kitting work-session tracker that runs alongside the existing labor tracking. Captures every kitting session and every "waiting on parts" pause as discrete intervals with a full audit trail. Operators don't learn anything new — they keep using the existing labor-tracking page; the kitting subsystem mirrors their actions silently when the work center is "KITTING".

**B. Advanced Analytics Suite** — 11 new analytics modules covering on-time delivery, predictive late alerts, yield trends, operator efficiency, capacity planning, rejection root cause, labor costs, floor status, build comparisons, and enhanced kitting intelligence. All accessible from a new "Advanced" tab on the Analytics page.

---

## 2. Hard rules followed

| Rule | How it's enforced |
|---|---|
| **Do not modify KOSH** | Only `SELECT` queries against KOSH. Zero `INSERT/UPDATE/DELETE`. |
| **Do not break existing labor tracking** | New tables only. Zero changes to existing `labor_entries` schema. Only added optional `pause_logs.reason` column (defaults to `BREAK`). |
| **No new operator-facing pages** | Everything hooks into the existing labor-tracking page and analytics page. |
| **"Waiting Parts" button only when kitting** | Button visibility gated on `lastStartedWorkCenterRef.current.includes('KIT') && isTimerRunning && activeEntryId`. |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXUS frontend (Next.js)                         │
│                                                                     │
│  /labor-tracking               /analytics                           │
│  ┌──────────────────┐          ┌──────────────────────────────────┐ │
│  │ Existing timer   │          │ 5 tabs:                          │ │
│  │ + Waiting Parts  │          │   Insights (+ Kitting Status)    │ │
│  │   button (KIT)   │          │   Trends   (+ Kitting Status)    │ │
│  │ + silent mirror  │          │   Forecast (+ Kitting Status)    │ │
│  │   to /kitting/*  │          │   Production Analytics           │ │
│  └────────┬─────────┘          │     └─ Kitting Analytics card    │ │
│           │                    │       (Gantt timeline, waiting)   │ │
│           │                    │   Advanced ← NEW TAB             │ │
│           │                    │     └─ 11 analytics modules      │ │
│           │                    └───────────────┬──────────────────┘ │
└───────────┼────────────────────────────────────┼───────────────────┘
            │                                    │
            ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXUS backend (FastAPI)                         │
│                                                                     │
│  /labor          (existing — unchanged behavior)                    │
│  /analytics/all  (existing — kitting_analytics block added)         │
│  /analytics/advanced  ← NEW (11 advanced metrics)                   │
│  /kitting/*           ← NEW (timer state machine, 10 endpoints)     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
     ┌──────────────────┐    ┌──────────────────────────┐
     │ NEXUS database   │    │ KOSH database (READ-ONLY) │
     │                  │    │                            │
     │ kitting_timer_   │    │ tblJob, tblBOM,            │
     │  sessions (NEW)  │    │ tblWhse_Inventory          │
     │ kitting_event_   │    │                            │
     │  logs (NEW)      │    │ Same SELECTs as before.    │
     │ pause_logs       │    │ Zero writes.               │
     │  + .reason col   │    └──────────────────────────┘
     │ labor_entries    │
     │  (unchanged)     │
     └──────────────────┘
```

---

## 4. State machine (Kitting Timer)

```
    IDLE ──start──▶ ACTIVE ──pause-waiting──▶ WAITING_PARTS
                      ▲                              │
                      └────────── resume ────────────┘
                      │
                     stop
                      ▼
                  COMPLETED
```

- One open session per traveler at any time (409 on illegal transitions)
- KOSH auto-closes WAITING_PARTS when parts arrive (does NOT auto-resume)
- Long-wait notification fires once per session after 24h

---

## 5. Database additions

### New tables
- **`kitting_timer_sessions`** — ACTIVE/WAITING_PARTS intervals per traveler (id, traveler_id, step_id, employee_id, session_type, start_time, end_time, duration_seconds, note)
- **`kitting_event_logs`** — Audit timeline (id, traveler_id, session_id, event_type, source, actor_id, payload, created_at)

### Existing table change
- **`pause_logs.reason`** — VARCHAR(32), default `'BREAK'`, also accepts `'WAITING_PARTS'`

### Migrations
- ✅ `migrations/add_pause_reason.py` — ran inside container
- ✅ `migrations/add_kitting_timer.py` — ran inside container (also auto-created by `Base.metadata.create_all()`)

---

## 6. All backend endpoints

### Kitting Timer (`/kitting`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/timer/{id}/start` | Start ACTIVE session |
| POST | `/timer/{id}/pause-waiting` | ACTIVE → WAITING_PARTS |
| POST | `/timer/{id}/resume` | WAITING_PARTS → ACTIVE |
| POST | `/timer/{id}/stop` | Close any open session |
| GET | `/timer/{id}` | State + sessions + events (polls KOSH, fires long-wait notification) |
| GET | `/analytics/{id}` | Per-job totals + active-vs-idle % |
| POST | `/timer/{id}/sync-kosh` | Manual KOSH check |
| POST | `/sweep-long-waits` | Batch scan for long waits (for cron) |
| PUT | `/timer/session/{id}` | Admin edit session |
| DELETE | `/timer/session/{id}` | Admin delete session |

### Advanced Analytics (`/analytics/advanced`)
Single `GET` endpoint returning all 11 modules:

| Module | Key | What it returns |
|---|---|---|
| On-Time Delivery | `on_time_delivery` | 12-week trend (shipped, on-time, late, rate per week), overall rate |
| Predictive Late Alerts | `predictive_late_alerts` | Jobs projected to miss due date (remaining hours vs available hours, projected days late) |
| First Pass Yield Trend | `yield_trend` | 12-week accepted/rejected/yield_pct |
| Operator Efficiency by WC | `operator_efficiency_by_wc` | Per operator + work center: hours, avg/entry, team avg, efficiency % |
| Daily Scorecard | `daily_scorecard` | Jobs shipped/started, steps done, hours logged, active timers, operators, overdue, vs-yesterday |
| Capacity Planning | `capacity_planning` | Next 2 weeks: available hours, committed hours, utilization %, operator count |
| Rejection Root Cause | `rejection_root_cause` | By work center + by customer: rejection rate, affected count |
| Floor Status | `floor_status` | All work centers with status (active/blocked/idle), active entries, waiting travelers, hours today |
| Previous Build Comparison | `build_comparisons` | Same part number historical: current vs previous hours, variance %, cycle time |
| Kitting Enhanced | `kitting_enhanced` | Priority queue (urgency sorted), kit-to-production handoff avg, operator kitting efficiency |
| Labor Cost per Job | `labor_costs` | Actual vs estimated hours, cost at $35/hr, variance |

---

## 7. Frontend — complete change list

### Files changed/created

| File | What |
|---|---|
| ✅ [labor-tracking/page.tsx](frontend/src/app/labor-tracking/page.tsx) | Waiting Parts button, `mirrorKittingTimer()` helper, `lastStartedTravelerIdRef` ref, silent mirror calls on start/pause-waiting/resume/stop |
| ✅ [AnalyticsSection.tsx](frontend/src/app/dashboard/components/AnalyticsSection.tsx) | Kitting Analytics card (always visible), waiting metrics, active-vs-idle bar, expandable Gantt timeline per job, KittingTimeline component |
| ✅ [ForecastCard.tsx](frontend/src/app/dashboard/components/ForecastCard.tsx) | Div-by-zero fix on step progress bar |
| ✅ [KittingInsightCard.tsx](frontend/src/app/dashboard/components/KittingInsightCard.tsx) | **NEW** — standalone kitting summary card (used on Insights/Trends/Forecast tabs) |
| ✅ [AdvancedAnalytics.tsx](frontend/src/app/dashboard/components/AdvancedAnalytics.tsx) | **NEW** — 11 analytics modules in collapsible cards |
| ✅ [analytics/page.tsx](frontend/src/app/analytics/page.tsx) | Inline Kitting Status card on Insights/Trends/Forecast tabs + new "Advanced" tab |

### What operators see (labor-tracking page)
1. Start a timer on a KITTING work center — works exactly as before.
2. New red **"Waiting Parts"** button appears (only when timer is running on a KIT work center).
3. Click it → timer pauses, job flagged as waiting on parts.
4. Click **Resume** → timer resumes, waiting duration captured.
5. Click **Stop** → timer stops, all data captured.
6. Behind the scenes: every action silently mirrors to `/kitting/timer/...`.

### What admins see (analytics page)

**Insights / Trends / Forecast tabs** — Kitting Status card at the top showing:
- 6 summary tiles (30d hours, avg/kit, done, active, ready, waiting)
- Forecast banner (hours to clear, hours blocked, hours per kit)
- Jobs waiting on parts list

**Production Analytics tab** — Kitting Analytics card at the bottom showing:
- Same summary tiles + waiting-on-parts metrics + active-vs-idle % bar
- 14-day kitting hours chart + 8-week throughput chart
- Active kitting queue table (click any row → expandable Gantt timeline with session bars + event log)

**Advanced tab (NEW)** — 11 collapsible analytics cards:
1. Daily Production Scorecard (with vs-yesterday comparison)
2. On-Time Delivery Rate (12-week green/red bar chart)
3. Predictive Late Alerts (jobs projected to miss due date, with projected days late)
4. First Pass Yield Trend (12-week accepted/rejected chart)
5. Floor Status Heatmap (all work centers: active/blocked/idle grid)
6. Capacity Planning (next 2 weeks utilization bars)
7. Operator Efficiency by Work Center (table with team avg comparison)
8. Rejection Root Cause (by work center + by customer, bar charts)
9. Labor Cost per Job (actual vs estimated, cost variance)
10. Previous Build Comparison (same part historical variance)
11. Kitting Priority Queue & Efficiency (urgency-sorted queue + operator speed)

---

## 8. Deployment status

| Target | Status | Notes |
|---|---|---|
| ✅ Docker backend | Deployed | Rebuilt with `--no-cache`, restarted, health check passing |
| ✅ Docker frontend | Deployed | Rebuilt with `--no-cache`, restarted |
| ✅ Vercel (`nexus` project → `aci-nexus.vercel.app`) | Deployed | Production READY. Previously deploying to wrong project (`nexus-frontend`) — fixed by relinking |
| ✅ Migrations | Ran | Both `add_pause_reason.py` and `add_kitting_timer.py` executed inside `nexus_backend` container |

### Deploy commands used
```bash
# Backend + Frontend Docker
docker compose build --no-cache backend frontend
docker compose up -d backend frontend

# Vercel (from /home/tony/NEXUS root, linked to nexus project)
cd /home/tony/NEXUS && vercel --prod --yes
```

### Vercel project mapping (resolved)
- `aci-nexus.vercel.app` → Vercel project `nexus` (projectId: `prj_f5sEZC0ezawvU5pxW3YRvJwROKk7`)
- Deployed from repo root with `vercel.json` pointing build to `frontend/` subdirectory
- API rewrites to Cloudflare tunnel: `https://dangerous-logo-examinations-indicating.trycloudflare.com/`

---

## 9. Verification

| Check | Status |
|---|---|
| `python3 -m py_compile` on all backend files | ✅ |
| `npx tsc --noEmit -p .` on entire frontend | ✅ zero errors |
| Migrations ran inside container | ✅ |
| Backend health check after deploy | ✅ `{"status":"healthy"}` |
| KOSH write grep on all new code | ✅ zero writes |
| Existing labor flow unchanged | ✅ |
| Notification dedup | ✅ `LONG_WAIT_NOTIFIED` event prevents double-notify |
| Mirror calls fire-and-forget | ✅ `.catch(() => {})` |
| Vercel deploy to correct project | ✅ fixed — now deploys to `nexus` not `nexus-frontend` |

---

## 10. Resolved decisions

| Question | Decision |
|---|---|
| Phase B scope | Shipped all — operator mirror, active-vs-idle bar, Gantt timeline, notifications |
| Vercel | ✅ Resolved — NEXUS IS on Vercel. Project = `nexus`, URL = `aci-nexus.vercel.app`. Deploy from repo root. |
| Auto-resume policy | Stop waiting + notify, do NOT auto-start active timer (operator clicks Resume manually) |
| Admin override UI | Endpoints exist, no admin screen — API-only for now |
| Long-wait notifications | Built — 24h threshold, idempotent, with sweep endpoint |
| Advanced analytics | Shipped as a separate `/analytics/advanced` endpoint + "Advanced" tab to keep existing analytics untouched |

---

## 11. Previously "Not Included" — now ALL DONE

- ✅ **Git commit** — 2 commits: `c3475ea` (kitting timer + advanced analytics) and `9266e5f` (shifts, rates, docs, checklists, comms)
- ✅ **Admin override UI** — `GET /features/kitting-sessions` lists all sessions with job number, employee, type, times. Edit/delete via existing `PUT/DELETE /kitting/timer/session/{id}`
- ✅ **Background sweep for long-waits** — asyncio task runs every 30 minutes inside the backend, calls `_maybe_notify_long_wait()` for every open WAITING_PARTS session
- ✅ **Shift model** — `shifts` table with name, start_hour, end_hour. CRUD at `GET/POST/DELETE /features/shifts`
- ✅ **Labor rate table** — `labor_rates` table with name, rate_per_hour, department, is_default. CRUD at `GET/POST/PUT/DELETE /features/labor-rates`. `get_effective_rate()` helper for dynamic cost calculations
- ✅ **Document attachments** — `job_documents` table with file upload to `static/uploads/documents/`. Upload via `POST /features/documents/{traveler_id}` (multipart), list via GET, delete via DELETE. Categories: general, drawing, spec, quality, customer. UI on traveler detail page
- ✅ **Quality checklist per step** — `quality_check_items` table with tri-state pass/fail/unchecked. CRUD at `GET/POST/PUT/DELETE /features/quality/*`. UI component (`QualityChecklist.tsx`) available per step
- ✅ **Customer communication log** — `communication_logs` table with type (note/email/phone/meeting), direction (internal/outbound/inbound), subject, message, contact name. CRUD at `GET/POST/DELETE /features/comms/*`. Full UI on traveler detail page with color-coded entries
- ❌ **KOSH writes** — zero, always (by design, not a TODO)

---

## 12. Complete file inventory

### Backend (8 files)
| File | Status | What |
|---|---|---|
| `backend/models.py` | Modified | `PauseLog.reason`, `KittingTimerSession`, `KittingEventLog` |
| `backend/main.py` | Modified | Registers `kitting_timer` + `analytics_advanced` routers |
| `backend/routers/kitting_timer.py` | **NEW** | State machine, 10 endpoints, KOSH poller, long-wait notifications |
| `backend/routers/analytics_advanced.py` | **NEW** | 11 advanced analytics modules |
| `backend/routers/analytics.py` | Modified | `kitting_analytics` block with waiting metrics |
| `backend/routers/labor.py` | Modified | `pause_reason` field, persists on PauseLog |
| `backend/routers/dashboard.py` | Modified | Bug fixes (KOSH BOM query, datetime, idle operators) |
| `backend/requirements.txt` | Modified | Loosened CI tool pins to fix pip resolution |

### Backend migrations (2 files)
| File | Status | What |
|---|---|---|
| `backend/migrations/add_pause_reason.py` | **NEW** | Adds `reason` column to `pause_logs` |
| `backend/migrations/add_kitting_timer.py` | **NEW** | Creates `kitting_timer_sessions` + `kitting_event_logs` |

### Frontend (6 files)
| File | Status | What |
|---|---|---|
| `frontend/src/app/analytics/page.tsx` | Modified | Kitting Status on 3 tabs, new Advanced tab |
| `frontend/src/app/labor-tracking/page.tsx` | Modified | Waiting Parts button, mirror calls, traveler ref |
| `frontend/src/app/dashboard/components/AdvancedAnalytics.tsx` | **NEW** | 11 analytics cards (~550 lines) |
| `frontend/src/app/dashboard/components/KittingInsightCard.tsx` | **NEW** | Standalone kitting summary |
| `frontend/src/app/dashboard/components/AnalyticsSection.tsx` | Modified | Kitting card, Gantt timeline, waiting metrics |
| `frontend/src/app/dashboard/components/ForecastCard.tsx` | Modified | Div-by-zero fix |

### Config (1 file)
| File | Status | What |
|---|---|---|
| `vercel.json` (root) | **NEW** | Build config pointing to `frontend/` subdirectory |

---

**Everything is deployed and live on Docker + Vercel (`aci-nexus.vercel.app`).**
