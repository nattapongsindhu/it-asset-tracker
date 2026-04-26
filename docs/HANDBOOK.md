# IT Asset Tracker Handbook

Complete handbook for the `IT Asset Tracker` project  
System status reference: **April 25, 2026**

Production URL: [https://it-asset-tracker-silk.vercel.app](https://it-asset-tracker-silk.vercel.app)

---

## 1. Vision and Context

This project was designed for operations-heavy organizations such as office support teams, equipment hubs, repair benches, and internal IT environments that regularly issue devices to staff.

The product vision is built around three pillars:

1. `Accountability`  
   The system should always be able to answer which asset is assigned to which employee, where it is located, when it was repaired or reassigned, and who performed the action.

2. `Atomic Transactions`  
   Critical workflows such as assignment, return-to-stock, move-to-repair, decommissioning, and maintenance logging should not leave the system in a half-completed state.

3. `Operational Intelligence`  
   The application should do more than store records. It should highlight risk through warranty alerts, maintenance cost tracking, movement history, and lifecycle visibility.

Short version:

> This system replaces manual spreadsheets with a digital operations workflow that is traceable, auditable, and reliable.

---

## 2. Project Overview

`IT Asset Tracker` is a web application for managing internal IT assets using `Next.js App Router + Supabase + Vercel` as its core platform.

At a high level:

- Users authenticate through `Supabase Auth`
- Middleware protects private routes
- Roles in `public.profiles` determine whether a user is `ADMIN` or `STAFF`
- `ADMIN` users manage inventory, assignment, movement, repair, retirement, bulk actions, and reports
- `STAFF` users can view only the assets assigned to them and submit repair requests
- Critical actions are written to `public.audit_logs`

Important architecture note:

- Prisma runtime is no longer part of the active stack
- Supabase is the source of truth for auth, database, RPC logic, and RLS
- Next.js is used for both server components and server actions; this is not a client-only application

---

## 3. Tech Stack and Tools

| Category | Tool | Responsibility |
|---|---|---|
| Framework | Next.js 14 App Router | Routing, server components, server actions, middleware |
| Language | TypeScript | Type safety and maintainability |
| Styling | Tailwind CSS | Layout, spacing, and responsive UI |
| Auth | Supabase Auth | Email/password and magic link authentication |
| Database | Supabase PostgreSQL | Assets, profiles, locations, assignments, maintenance, and audit data |
| Security | Supabase RLS | Role-aware access control |
| Validation | Zod | Input validation in forms and actions |
| Icons | Lucide React | UI iconography |
| Hosting | Vercel | Production and preview deployments |

---

## 4. High-Level Architecture

| Layer | Responsibility |
|---|---|
| `app/*` | Routes, page composition, forms, and user-facing UI |
| `app/actions/assets.ts` | Asset workflows, lifecycle logic, repair flows, and bulk actions |
| `lib/supabase/session.ts` | Session lookup, role resolution, and route guards |
| `middleware.ts` | Authentication redirect and route protection |
| `lib/site-url.ts` | Absolute URL generation and safe redirect handling |
| `lib/audit.ts` | Audit logging helper |
| `supabase/migrations/*` | Schema, policies, and RPC functions |

Behavior flow:

1. A user opens a page in Next.js
2. Middleware and session helpers validate access
3. A form or UI action calls a server action
4. The server action calls `supabase.rpc(...)` or a direct query when appropriate
5. The database writes asset state, history, and audit records
6. The UI revalidates and renders timestamps in the browser's local timezone

---

## 5. Database Model Summary

### 5.1 Core Tables

| Table | Purpose |
|---|---|
| `public.profiles` | User profile and role information |
| `public.assets` | Primary asset records |
| `public.asset_assignments` | Check-in, check-out, and reassignment history |
| `public.locations` | Buildings, floors, hubs, or storage points |
| `public.maintenance_logs` | Repair history, technician, cost, and notes |
| `public.audit_logs` | Audit trail for critical actions |

### 5.2 Data Integrity Strategy

Historical records are intentionally preserved.

- `asset_assignments.asset_id` uses `set null on delete`
- `maintenance_logs.asset_id` uses `set null on delete`
- History tables also store `asset_tag_snapshot`

This means:

- An asset can be removed from active inventory
- Assignment history and maintenance history remain available
- Audit and post-incident review stay useful even after deletion

---

## 6. Authentication, Authorization, and RLS

### 6.1 Authentication

The system supports:

- Email / Password
- Magic Link

### 6.2 Role Model

| Role | Primary Access |
|---|---|
| `ADMIN` | Full inventory, assignment, lifecycle, reporting, and audit control |
| `STAFF` | Self-service asset view and repair request access |

### 6.3 Guard Layers

- `middleware.ts` protects public and private routes
- `requireSupabaseUser()` enforces signed-in access
- `requireSupabaseAdmin()` enforces admin-only access
- `RLS` provides an additional database-level safety layer

### 6.4 Redirect Rules

All redirect and callback behavior should rely on:

- `lib/site-url.ts`
- `getURL()`
- `getSafeRedirectPath()`

Never:

- Hardcode `localhost` in auth callback behavior
- Accept redirect paths without sanitization

---

## 7. Phased Development Summary

| Phase | Theme | Deliverables |
|---|---|---|
| Phase 1 | Infrastructure and Core UI | Supabase auth, dashboard, analytics foundation, CSV export, audit UI |
| Phase 2 | Operations | Assignments, locations, lifecycle controls, My Assets, data integrity improvements |
| Phase 3 | Intelligence | Warranty alerts, maintenance logs, repair history, search |
| Phase 4 | Hardening | Bulk actions, monthly reporting, login polish, favicon, production cleanup |

### Phase 1

- Replaced Prisma runtime with a Supabase-first architecture
- Stabilized authentication, role handling, and dashboard flows
- Delivered audit UI, print cleanup, CSV export, and analytics groundwork

### Phase 2

- Added real assignment history and check-in/check-out workflows
- Added location tracking
- Added staff-facing `My Assets`
- Added lifecycle control for repair, return, and retirement
- Improved delete behavior to preserve history

### Phase 3

- Added warranty alerts
- Added maintenance logs with cost tracking
- Added repair history panels
- Added global search

### Phase 4

- Added bulk location movement
- Added bulk status updates
- Added monthly maintenance CSV reporting
- Polished login presentation and added a favicon
- Completed final production hardening

---

## 8. Key Features

### 8.1 Dashboard

- Status summary cards
- Category analytics
- Searchable inventory snapshot
- Warranty watch summary

### 8.2 Asset Assignment

- Assign
- Reassign
- Return to stock
- Per-asset assignment history
- Audit logging

### 8.3 Location Tracking

- Current location stored on each asset
- Single-asset location move
- Bulk location move
- `ASSET_MOVED` audit events

### 8.4 Maintenance and Repair

- Repair intake through RPC
- Maintenance logs with `technician_name`, `cost`, and `notes`
- Repair history panel
- Monthly maintenance CSV reporting

### 8.5 Warranty Alerts

- `Expired`
- `Due In 30 Days`
- `Time Remaining`

### 8.6 Global Search

Case-insensitive search across:

- `asset_tag`
- `serial_number`
- `model`

### 8.7 Bulk Actions

- Bulk status changes
- Bulk location moves
- CSV export for the filtered asset list

---

## 9. Installation and Local Development

### 9.1 Clone the Repository

```bash
git clone https://github.com/nattapongsindhu/it-asset-tracker.git
cd it-asset-tracker
```

### 9.2 Install Dependencies

```bash
npm install
```

### 9.3 Configure Environment Variables

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### 9.4 Run the Development Server

```bash
npm run dev
```

Defaults:

- App URL: `http://localhost:3001`
- Login URL: `http://localhost:3001/login`

### 9.5 Run a Build Check

```bash
npm run build
```

---

## 10. Deployment to Production

### 10.1 Vercel Flow

1. Push a branch or `main` to GitHub
2. Let Vercel trigger deployment automatically
3. Confirm the deployment status is `Ready`
4. Run a short smoke test across login, dashboard, inventory, and repair/report flows

### 10.2 Supabase Flow

Migrations are the source of truth for database changes.

```bash
supabase db push --yes
```

### 10.3 Recommended Release Checklist

1. Run `npm run build`
2. Apply the required migration set
3. Push code to `main`
4. Wait for Vercel deployment success
5. Run a short production smoke test

---

## 11. User Manual

### 11.1 Admin Workflow

Admins can:

- Review dashboard analytics
- Search assets by tag, serial, or model
- Create, edit, and delete assets
- Assign, reassign, and return assets
- Move locations
- Send assets to repair
- Log maintenance work
- Decommission assets
- Use bulk actions
- Export CSV reports
- Review and clear audit log entries

Example admin flow:

1. Open `/dashboard/assets`
2. Search for a target asset
3. Open the asset detail page
4. Assign it, move it, or send it to repair
5. Log maintenance work as needed
6. Export monthly reporting data

### 11.2 Staff Workflow

Staff users can:

- Sign in
- Open `/assets`
- View only the assets assigned to their account
- Open asset detail pages
- Click `Request Repair`

Staff restrictions:

- They cannot view other users' assets
- They do not have access to bulk actions
- They cannot access `/audit`
- They cannot directly change lifecycle or maintenance records

---

## 12. Timezone Strategy

The application follows a browser-local time display strategy:

- Timestamps are stored in the database using standard time handling
- UI rendering is based on the user's browser timezone
- `LocalizedDateTime` is the shared display component

Primary development reference timezone:

- `America/Los_Angeles`

Benefits:

- Users see timestamps in their own local environment
- Cross-timezone confusion is reduced
- Warranty remaining calculations align with what the user sees on screen

Areas affected by this strategy:

- Asset detail timestamps
- Audit log timestamps
- Assignment history
- Maintenance history
- Warranty remaining labels

---

## 13. Audit Strategy

Examples of tracked audit actions:

- `ASSET_CREATED`
- `ASSET_UPDATED`
- `ASSET_DELETED`
- `ASSET_ASSIGNED`
- `ASSET_REASSIGNED`
- `ASSET_UNASSIGNED`
- `ASSET_MOVED`
- `ASSET_REPAIR_REQUESTED`
- `ASSET_SENT_TO_REPAIR`
- `ASSET_MAINTENANCE_LOGGED`
- `ASSET_DECOMMISSIONED`

Core principle:

- The system should always be able to answer who did what, when, and to which asset
- Bulk location moves log one audit event per asset for better traceability
- The audit page acts as both an operational review tool and a lightweight compliance trail

---

## 14. Pros and Cons

### 14.1 Pros

| Strength | Detail |
|---|---|
| Atomic workflows | Assignment, repair, and lifecycle actions rely on RPC and transaction-aware logic |
| Zero-cost-friendly stack | Next.js + Supabase + Vercel works well for lean internal deployments |
| Audit readiness | Critical actions are consistently recorded |
| Practical operations focus | Assignment, movement, maintenance, and warranty handling are built for real use |
| Clear role separation | Admin and staff responsibilities are easy to reason about |

### 14.2 Constraints

| Constraint | Detail |
|---|---|
| Single-tenant orientation | The system is not yet a multi-tenant enterprise platform |
| CSV-centered reporting | Reporting is still more export-oriented than BI-oriented |
| Automation is still limited | Email alerts and scheduled jobs remain future work |
| Mobile field workflow can evolve further | The UI is usable on mobile, but not yet scanner-native |

---

## 15. Future Roadmap

Recommended next steps:

1. QR code / barcode lookup
2. Automated warranty and repair SLA alerts
3. Scheduled recurring reports
4. Advanced audit explorer with richer filters
5. Department-level permission model
6. Depreciation tracking and deeper maintenance cost analytics

---

## 16. Handover Notes

Important guidance for future maintainers:

- Do not reintroduce Prisma runtime unless explicitly requested
- Any auth redirect work should rely on `lib/site-url.ts`
- Assignment logic should continue to use `assigned_user_id -> profiles.id`
- Critical workflows should prefer RPC over scattered multi-query mutations
- Any future delete behavior changes should be reviewed carefully against `asset_assignments` and `maintenance_logs`

Short release checklist:

```bash
npm run build
supabase db push --yes
git push origin main
```

---

## 17. Final Status

As of `April 25, 2026`, the project status is:

- Production deployed
- Phase 1 completed
- Phase 2 completed
- Phase 3 completed
- Phase 4 completed

Short version:

> The system is ready for real internal IT operations in small to mid-sized organizations that need reliable assignment tracking, location visibility, maintenance records, warranty awareness, and auditability.
