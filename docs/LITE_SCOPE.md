# IT Asset Tracker Portfolio Lite Scope

## Project Goal

Upgrade the existing `it-asset-tracker` repository into a portfolio-friendly internal tool that is realistic, deployable on Vercel, and small enough to finish without drifting into the production-grade blueprint.

This Lite version should preserve the current CRUD-oriented app structure where practical, swap the local-only stack for Supabase Auth + Postgres, and stay interview-ready rather than enterprise-complete.

## Target Users

- A small internal IT or office operations team managing company devices
- An admin who creates, updates, assigns, and retires assets
- Staff users who can sign in and view inventory details relevant to normal operations
- Recruiters, hiring managers, and interviewers reviewing a deployable full-stack project

## Scope Lock

- Modify the existing repo instead of rewriting from scratch
- Preserve the current route structure and UX where that keeps delivery faster
- Keep the domain intentionally small: users, assets, assignments, and audit entries
- Prefer simple server-side authorization and minimal policy work over enterprise controls
- Authentication target for Lite: ship hybrid Magic Link plus Email/password login
- Magic Link is public-facing and must later enforce a hard cap of 10 total users

## In-Scope Features

- Next.js 14 App Router with TypeScript and Tailwind CSS
- Supabase Auth with Magic Link and Email/password login
- `ADMIN` and `STAFF` roles
- Default Admin and Staff accounts as project requirements
- Dashboard with asset counts by status
- Asset list with basic filtering/search carried forward from the current app
- Asset detail page
- Create, edit, and delete asset flows
- Basic assignment using `assigned_user_id` on assets
- Basic audit log for login and asset mutations
- Compact, paper-saving print views for menus and items
- Vercel deployment with Supabase-backed persistence

## Out-of-Scope Features

- Invite flow
- File uploads
- Maintenance workflow
- Full print/export system
- Full rate limiting strategy
- Enterprise rollback, runbook, or operations documentation
- Multi-tenant support
- Advanced approval workflows
- Background jobs, notifications, or scheduled tasks
- Large UI redesign unrelated to the Lite migration

## Target Architecture

| Area | Portfolio Lite Target |
|---|---|
| Frontend | Existing Next.js 14 App Router app, mostly server-rendered pages plus light client components |
| Styling | Existing Tailwind CSS setup with incremental cleanup only |
| Auth | Supabase Auth using Magic Link, Email/password, and cookie-backed SSR session handling |
| Roles | `profiles` table keyed to auth user id, with a simple `role` column (`ADMIN` or `STAFF`) |
| Data | Supabase Postgres with small tables for `profiles`, `assets`, and `audit_logs` |
| Assignment | `assets.assigned_user_id` references a user/profile id |
| Authorization | Role checks in server components/actions and minimal Supabase policies needed to support the app safely |
| Deployment | Vercel for the app, Supabase for auth/database, environment-driven config |
| Migration Strategy | Replace Prisma/SQLite/NextAuth incrementally while keeping current pages and flow recognizable |

## Phase-by-Phase Plan

| Phase | Goal |
|---|---|
| Phase 0 | Lock Lite scope, inspect repo, and document migration boundaries |
| Phase 1 | Set up Supabase foundation: environment variables, auth helpers, target schema, and shared app types |
| Phase 2 | Migrate authentication and session/role handling while preserving the current login and navigation flow |
| Phase 3 | Migrate read paths: dashboard counts, asset list, asset detail, and audit log queries |
| Phase 4 | Migrate write paths: create, edit, delete, assignment, and audit logging |
| Phase 5 | Remove legacy Prisma/SQLite/NextAuth code, refresh docs/env setup, and prepare Vercel deployment |
| Final | Smoke test the Lite app locally and on Vercel preview, then do final portfolio polish only |

## Estimated Effort Range

- Roughly 14-24 focused hours
- Equivalent to about 3-5 working sessions if we preserve the current UI and route layout
- The low end assumes no invite flow and only light data migration needs

## Major Risks

- Authentication replacement touches the login page, middleware, navigation, redirects, and server-side guards
- Prisma is called directly inside pages and server actions, so the migration surface is spread across multiple files
- Current ids are Prisma `cuid()` values, while Supabase-auth-backed tables usually prefer `uuid` user ids
- Role handling must stay simple, consistent, and easy to reason about or it will create hidden scope creep
- Vercel deployment will fail if any SQLite or local-file assumptions survive the migration
- Hybrid auth plus a public Magic Link entry point adds extra testing and anti-spam requirements
