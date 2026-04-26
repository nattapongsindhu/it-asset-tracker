# IT Asset Tracker

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Production-black?style=flat-square&logo=vercel)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)
![Status](https://img.shields.io/badge/Status-Production_Ready-22C55E?style=flat-square)

> A production-ready IT asset management system for operations-heavy internal teams that need clear assignment history, location tracking, maintenance records, warranty visibility, and auditability.

Production: [it-asset-tracker-silk.vercel.app](https://it-asset-tracker-silk.vercel.app)

Documentation status: **April 25, 2026**  
Current release status: **Phase 4 Completed**

Note: the `SQLite` badge is intentionally retained for project history. The active runtime is now **Supabase-first**, and Prisma runtime is no longer part of the production architecture.

---

## Project Overview

`IT Asset Tracker` replaces manual spreadsheets and lightweight checklists with a structured digital workflow for internal IT operations. It helps teams answer questions such as:

- Which employee currently holds this device?
- Where is the asset physically located?
- When was it reassigned, repaired, retired, or returned to stock?
- Which user performed a critical operational action?

The current platform is built on `Next.js App Router + Supabase + Vercel` and is optimized around:

- `Accountability`: every important workflow can be traced back to a user and timestamp
- `Atomic Workflows`: assignment, repair, and lifecycle transitions are handled through RPC-backed logic
- `Operational Intelligence`: warranty alerts, maintenance logs, search, bulk actions, and monthly reporting

Full handbook: [docs/HANDBOOK.md](docs/HANDBOOK.md)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 App Router | UI, routing, server components, server actions |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Responsive UI and visual system |
| Auth | Supabase Auth | Email/password and magic link |
| Database | Supabase PostgreSQL | Assets, profiles, locations, maintenance, and audit data |
| Security | Supabase RLS | Role-aware access control |
| Validation | Zod | Form and action validation |
| Hosting | Vercel | Production deployment |

---

## Phased Development Summary

| Phase | Focus | Outcome |
|---|---|---|
| Phase 1 | Infrastructure & Core UI | Supabase auth, dashboard, CSV export, audit UI, analytics foundation |
| Phase 2 | Operations | Assignment workflow, location tracking, lifecycle flows, My Assets |
| Phase 3 | Intelligence | Warranty alerts, maintenance logs, repair history, global search |
| Phase 4 | Hardening | Bulk move/status actions, monthly maintenance report, login polish, favicon |

---

## Key Features

- Dashboard analytics with category summary and warranty watch
- Asset assignment with assign, reassign, and return-to-stock flows
- Location tracking for single-device and bulk movement
- Maintenance logs with technician, cost, notes, and repair history
- Warranty alerts for expired and near-expiry assets
- Staff-facing `My Assets` and `Request Repair`
- Global search by `asset_tag`, `serial_number`, and `model`
- Bulk actions for status changes and location moves
- Monthly maintenance CSV reporting
- Audit log visibility with admin cleanup controls

---

## Core Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Sign-in entrypoint |
| `/dashboard` | Admin | Executive snapshot and analytics |
| `/dashboard/assets` | Admin | Inventory, filters, bulk actions, and exports |
| `/assets` | Staff / Admin | Staff sees `My Assets`; admin uses detail navigation |
| `/assets/[id]` | Authenticated | Asset detail, assignment, maintenance, and lifecycle |
| `/audit` | Admin | Audit review and cleanup |

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/nattapongsindhu/it-asset-tracker.git
cd it-asset-tracker
npm install
```

### 2. Configure the environment

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### 3. Run locally

```bash
npm run dev
```

Local URL: [http://localhost:3001/login](http://localhost:3001/login)

### 4. Run a production build check

```bash
npm run build
```

---

## Deployment Notes

- Use `Vercel` for production hosting
- Use `supabase db push --yes` to apply migrations to the remote project
- All auth redirects and callback paths should rely on `lib/site-url.ts`
- Avoid hardcoding `localhost` in redirect logic
- Run `npm run build` before pushing production changes

---

## Timezone and Data Integrity

### Timezone

- Timestamps are stored in the database using standard timestamp handling
- UI rendering uses the user's browser timezone through `LocalizedDateTime`
- The primary development reference timezone for this project is `America/Los_Angeles`

### Data Integrity

- `public.asset_assignments` and `public.maintenance_logs` store history separately from the main asset record
- When an asset is deleted, `asset_id` follows a `set null on delete` strategy
- Snapshot fields such as `asset_tag_snapshot` preserve context for audit and historical review

---

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run generate:manual
```

---

## Pros and Constraints

### Pros

- Supabase-first architecture is simple to operate and cost-efficient
- RPC-based workflows reduce partial-write risk
- Audit trail coverage is strong across operational actions
- Admin and staff responsibilities are clearly separated
- Ready for real internal IT asset operations

### Constraints

- Still designed primarily as a single-tenant system
- Reporting is more CSV-centered than BI-dashboard-centered
- Email alerts and scheduled automation remain roadmap items

---

## Documentation

- Full handbook: [docs/HANDBOOK.md](docs/HANDBOOK.md)
- Setup notes: [docs/SETUP_LITE.md](docs/SETUP_LITE.md)
- Migration notes: [docs/MIGRATION_NOTES.md](docs/MIGRATION_NOTES.md)

---

## License

MIT
