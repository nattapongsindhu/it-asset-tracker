# IT Asset Tracker

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Production-black?style=flat-square&logo=vercel)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-22C55E?style=flat-square)

> Internal web application for tracking company IT assets with Supabase auth, role-based access control, audit logging, printable inventory views, and a modern Next.js App Router frontend.

Current production deployment: [it-asset-tracker-silk.vercel.app](https://it-asset-tracker-silk.vercel.app)

README status reference: April 23, 2026

Legacy Prisma/SQLite badges are intentionally retained for project history. The current runtime architecture is Supabase-first.

---

## Overview

This project manages internal IT assets such as laptops, monitors, peripherals, and other equipment. It supports:

- Email/password sign-in and magic link authentication via Supabase Auth
- Role-aware access for `ADMIN` and `STAFF`
- Dashboard, asset list, asset detail, edit, create, and audit log flows
- Audit trail logging for asset mutations
- Printable asset pages with cleaner A4 output
- Browser-local timezone display for asset and audit timestamps

---

## Current Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Auth / Session | Supabase Auth + `@supabase/ssr` |
| Validation | Zod |
| Deployment | Vercel |

Important application modules:

- `lib/supabase/session.ts`: session lookup and role enforcement
- `middleware.ts`: route protection and login redirect handling
- `lib/site-url.ts`: canonical redirect URL helper via `getURL()`
- `app/actions/assets.ts`: server actions for asset mutations
- `lib/audit.ts`: audit log writes to `public.audit_logs`
- `lib/supabase/admin.ts`: admin Supabase client for privileged operations

Project rule of thumb:

- Do not reintroduce Prisma runtime unless explicitly requested.
- For auth redirect work, use `lib/site-url.ts` instead of hardcoding local URLs.
- For assignment, use `assets.assigned_user_id -> profiles.id` rather than a duplicate text owner field.

---

## Current Status

Confirmed working as of April 23, 2026:

- Supabase is the primary backend and auth provider
- Email/password and magic link sign-in both work
- Role and RLS behavior are active
- `admin@company.com` and `septuplex7@gmail.com` are configured as admins
- Dashboard, asset list, and audit log pages are working
- Sidebar active state is fixed for `/dashboard` and `/dashboard/assets`
- Print layout has been reduced to the main content and cleaned up for paper output
- Asset detail and audit timestamps render in the browser timezone
- Audit log reads live data and supports delete actions in the UI
- Audit page is capped at the latest 1000 entries

---

## Routes

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Sign in with email/password and magic link flow |
| `/auth/callback` | Public | Supabase auth callback and redirect handling |
| `/dashboard` | Authenticated | Main dashboard |
| `/dashboard/assets` | Authenticated | Asset list, filters, print view, and admin add modal |
| `/assets/new` | Admin only | Dedicated create page |
| `/assets/[id]` | Authenticated | Asset detail page |
| `/assets/[id]/edit` | Admin only | Asset edit page |
| `/audit` | Admin only | Audit trail with up to 1000 recent entries |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/nattapongsindhu/it-asset-tracker.git
cd it-asset-tracker
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and provide values for:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Notes:

- `NEXT_PUBLIC_SITE_URL` should match the current site origin for redirects.
- Do not hardcode `localhost` in auth redirect logic. Use `getURL()` from `lib/site-url.ts`.

### 3. Start the app

```bash
npm run dev
```

Local app URL: [http://localhost:3001/login](http://localhost:3001/login)

### 4. Production build

```bash
npm run build
npm run start
```

---

## Authentication And Access

- Supabase Auth supports both email/password and magic link flows
- Middleware redirects unauthenticated users to `/login`
- `next` query params are validated through `getSafeRedirectPath()`
- Session and role checks are enforced again in server-side code
- Admin-only flows are guarded in `requireSupabaseAdmin()`

---

## Audit Logging

The app records important actions to `public.audit_logs`.

Current audit-related behavior includes:

- Viewing recent audit entries in the admin UI
- Rendering actor email from `public.profiles`
- Deleting single audit entries from the UI
- Clearing all audit entries from the UI

If delete actions fail with `permission denied for table audit_logs`, check Supabase grants and RLS delete policies for `public.audit_logs`, especially for admin users.

---

## UI Notes

- Print output is optimized to avoid overflow and remove non-essential chrome
- Edit buttons use cleaner icon styling
- Asset and audit timestamps are localized in the browser
- Sidebar route highlighting is aligned with the current dashboard paths

---

## Phase 2 Work

Immediate next implementation area:

- Asset assignment workflow using `public.profiles`
- Automatic status changes for assign and unassign
- Assignment audit events for assigned, unassigned, and reassigned flows
- Correct assigned-user display across create, edit, list, and detail pages

Planned follow-up work:

- Bulk asset actions for admins
- CSV export
- Dashboard analytics and charting
- Richer assignment history and lifecycle reporting

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

## License

MIT
