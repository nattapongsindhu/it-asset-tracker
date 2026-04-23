# IT Asset Tracker Production-Grade Blueprint

## Document Purpose

This blueprint defines how to evolve the existing GitHub repository `nattapongsindhu/it-asset-tracker` into a production-ready internal asset management system on Vercel and Supabase.

This document is based on:
- the current repository state inspected locally
- the existing project brief and blueprint materials already present in the repo
- the required Production-Grade Engineering workflow: `/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`

If the project is referred to elsewhere as `it-access-tracker`, treat that as the same project. The inspected repository name is `it-asset-tracker`.

## Executive Summary

The current app is already a usable internal tool built with Next.js, TypeScript, Tailwind CSS, Prisma, SQLite, and NextAuth Credentials. It supports login, role-based access, asset CRUD, dashboard metrics, and audit logs.

The production target is a simplified and more deployable architecture:
- frontend and hosting on Vercel
- authentication on Supabase Hybrid Auth with email/password and magic link for existing users
- database on Supabase Postgres
- file uploads on Supabase Storage
- row-level access control through Supabase RLS

The migration must preserve the current business rules while improving deployment readiness, security posture, maintainability, and operational traceability.

## Current-State Baseline

### Confirmed Stack

The repository currently uses:
- Next.js 14 App Router
- React 18
- TypeScript 5
- Tailwind CSS 3
- Prisma 5
- SQLite
- NextAuth v4 with Credentials provider
- Zod validation
- bcryptjs password hashing

### Confirmed Routes

The current application includes:
- `/login`
- `/dashboard`
- `/assets`
- `/assets/new`
- `/assets/[id]`
- `/assets/[id]/edit`
- `/audit`

### Confirmed Business Rules

The current implementation already enforces:
- roles: `ADMIN`, `STAFF`
- asset statuses: `IN_STOCK`, `ASSIGNED`, `IN_REPAIR`, `RETIRED`
- admin-only create, edit, and delete operations for assets
- admin-only audit log access
- route protection through middleware
- server-side auth checks before data mutation
- audit log writing for important actions
- plain-text note rendering to avoid XSS

### Current Data Model

The current Prisma schema includes:
- `User`
- `Asset`
- `AuditLog`

Current limitations:
- assignment history is flattened into `Asset.assignedUserId`
- maintenance is stored only as status and notes
- there is no document storage layer
- SQLite is not an ideal production backend for Vercel deployment

### Current Demo Accounts

The repository currently seeds:
- `admin@company.com` / `admin123`
- `staff@company.com` / `staff123`

Required future QA and seed credentials for the production-ready blueprint:
- `admin@company.com` / `admin123`
- `staff@company.com` / `staff123`

This means the current seed flow must be updated during migration so the staff account matches the required verification credential.

## Production Objective

Build a robust internal IT asset tracker that is:
- secure enough for real internal use
- simple enough to maintain
- auditable enough for operational accountability
- deployable without SQLite or local-only auth dependencies

The system must support:
- hybrid authentication for admins and staff through email/password and magic link
- inventory visibility
- asset CRUD
- assignment and return workflows
- maintenance tracking
- audit logging
- file attachment support for receipts, warranties, and photos

## Target Production Architecture

### Application Layer

- Next.js App Router remains the frontend and full-stack application framework.
- Vercel is the deployment platform for production and preview environments.
- Server Components and Server Actions should remain the default pattern unless a route handler is clearly more appropriate.

### Authentication Layer

- Supabase Auth replaces NextAuth Credentials in the production path with Hybrid Auth support for email/password and magic link sign-in.
- User identity originates from `auth.users`.
- Application profile metadata is stored in a `profiles` table keyed by the auth user id.
- Magic link access must be limited to existing users only; no public self-service signup.
- Route protection must be enforced both in UI flow and server-side data access.

### Data Layer

Supabase Postgres becomes the primary relational store.

Recommended core tables:
- `profiles`
- `assets`
- `asset_assignments`
- `maintenance_logs`
- `asset_files`
- `audit_logs`

### Storage Layer

- Supabase Storage bucket: `asset-files`
- Recommended path convention: `assets/{asset_id}/{filename}`
- File access must be controlled through signed URLs or server-mediated access when needed

### Security Layer

- Row Level Security is mandatory on all business tables.
- Admin users can manage all business data.
- Staff users can only read the records they are authorized to see.
- Service-role keys must never be exposed to browser code.

## Proposed Production Data Blueprint

### `profiles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key, matches `auth.users.id` |
| `email` | `text` | unique |
| `full_name` | `text` | required |
| `role` | `text` | `ADMIN` or `STAFF` |
| `department` | `text` | nullable |
| `created_at` | `timestamptz` | default now |

### `assets`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `asset_tag` | `text` | unique |
| `category` | `text` | laptop, monitor, keyboard, etc. |
| `brand` | `text` | required |
| `model` | `text` | required |
| `serial_number` | `text` | nullable |
| `status` | `text` | `IN_STOCK`, `ASSIGNED`, `IN_REPAIR`, `RETIRED` |
| `condition` | `text` | `NEW`, `GOOD`, `FAIR`, `DAMAGED` |
| `purchase_date` | `date` | nullable |
| `purchase_cost` | `numeric` | nullable |
| `vendor` | `text` | nullable |
| `location` | `text` | nullable |
| `warranty_expiry` | `date` | nullable |
| `notes` | `text` | nullable |
| `created_by` | `uuid` | references `profiles.id` |
| `created_at` | `timestamptz` | default now |
| `updated_at` | `timestamptz` | updated automatically |

### `asset_assignments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `asset_id` | `uuid` | references `assets.id` |
| `user_id` | `uuid` | references `profiles.id` |
| `assigned_at` | `timestamptz` | required |
| `returned_at` | `timestamptz` | nullable |
| `assigned_by` | `uuid` | references `profiles.id` |
| `note` | `text` | nullable |

### `maintenance_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `asset_id` | `uuid` | references `assets.id` |
| `issue` | `text` | required |
| `status` | `text` | `OPEN`, `IN_PROGRESS`, `RESOLVED` |
| `vendor` | `text` | nullable |
| `cost` | `numeric` | nullable |
| `opened_at` | `timestamptz` | required |
| `resolved_at` | `timestamptz` | nullable |
| `note` | `text` | nullable |
| `created_by` | `uuid` | references `profiles.id` |

### `asset_files`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `asset_id` | `uuid` | references `assets.id` |
| `file_name` | `text` | required |
| `file_path` | `text` | required |
| `file_type` | `text` | receipt, warranty, image, other |
| `uploaded_by` | `uuid` | references `profiles.id` |
| `created_at` | `timestamptz` | default now |

### `audit_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `actor_id` | `uuid` | nullable, references `profiles.id` |
| `action` | `text` | required |
| `entity_type` | `text` | required |
| `entity_id` | `uuid` | nullable |
| `detail` | `jsonb` | nullable, use structured payloads |
| `created_at` | `timestamptz` | default now |

## RLS and Access Policy Blueprint

### Admin Access

Admins can:
- read all tables
- create and update all business records
- delete records where deletion is explicitly allowed
- read all audit logs
- manage assignments, maintenance, and file attachments

### Staff Access

Staff can:
- read their own profile
- read assets assigned to them
- read limited inventory views if the product decision allows it
- never create, edit, retire, or delete assets unless the spec explicitly adds a self-service workflow
- never read global audit logs

### Policy Design Rules

- Every business table must have RLS enabled.
- Every access rule must be implemented through explicit SQL policy statements.
- UI hiding is not authorization.
- Server checks and RLS must both exist.
- Audit logging must remain server-controlled.

## Required Demo and Verification Accounts

The production-ready project must support these development and QA accounts:

1. Admin
   - Username: `admin@company.com`
   - Password: `admin123`

2. Staff
   - Username: `staff@company.com`
   - Password: `staff123`

Rules:
- these accounts must be reproducible in local and preview environments
- the seed or onboarding flow must document how they are created
- `/test` must verify password sign-in and magic link sign-in for authorized users
- `/test` must verify that admin-only routes reject the staff account

## Delivery Workflow Contract

The engineering team or AI coding agent must strictly work through the following phases. No phase may be skipped.

## `/spec` Phase

### Goal

Turn a request into a precise technical specification before code is changed.

### Required Output

The `/spec` output must include:
- problem statement
- current-state summary from repository inspection
- migration impact analysis
- scope and non-scope
- target architecture
- security constraints
- success criteria
- unresolved risks

### Project-Specific Questions That Must Be Answered

- Will the migration remove Prisma completely or use a temporary bridge?
- Will staff see all assets or only assigned assets in the first production release?
- Which records are hard deleted versus soft-retired?
- Are maintenance and file uploads in the first release or a follow-up slice?
- How will legacy SQLite data move into Supabase Postgres?

### Definition of Done

The `/spec` phase is done only when:
- the current and target states are explicit
- all major migration risks are named
- business rules are not ambiguous
- no implementation code has been written yet

## `/plan` Phase

### Goal

Convert the approved specification into small, atomic, dependency-aware tasks.

### Required Output

The `/plan` output must include:
- exact files to create, edit, or remove
- schema and migration tasks
- auth tasks
- UI and route tasks
- storage tasks
- verification tasks
- deployment tasks
- a rollback note for risky slices

### Planning Rules

- tasks must be ordered by dependency
- each task must be small enough to verify independently
- each task must have a clear definition of done
- risky migrations must be isolated from UI refactors

### Recommended Task Order

1. Supabase project setup and SQL schema
2. profile sync and auth foundation
3. route protection migration
4. asset read path migration
5. asset create and edit path migration
6. assignment history implementation
7. maintenance logs
8. storage-backed file uploads
9. audit hardening
10. README, onboarding, and deploy documentation

### Definition of Done

The `/plan` phase is done only when:
- task order is dependency-safe
- definitions of done are explicit
- verification steps are attached to each major slice
- rollback considerations exist for auth and database migration

## `/build` Phase

### Goal

Implement the approved plan one slice at a time.

### Build Rules

- do not attempt a full rewrite in one pass
- verify each slice before starting the next slice
- keep changes reversible
- prefer explicit code over abstraction-heavy code
- preserve working behavior unless the approved spec changes it

### Recommended Build Slices

#### Slice 1: Platform Foundation

Deliver:
- Supabase project wiring
- environment variable scaffolding
- database schema scripts
- RLS setup

Definition of done:
- app can connect safely to Supabase
- schema exists in a repeatable form
- policies are versioned

#### Slice 2: Auth Migration

Deliver:
- Supabase Auth login flow
- profile lookup and role resolution
- protected route migration from NextAuth middleware

Definition of done:
- admin and staff can sign in
- session checks work in server contexts
- unauthorized users are redirected or rejected cleanly

#### Slice 3: Asset Core

Deliver:
- dashboard stats
- asset listing
- asset detail page
- asset create and edit paths

Definition of done:
- asset CRUD works against Supabase
- existing business rules remain intact
- validation still happens server-side

#### Slice 4: Assignment History

Deliver:
- asset assignment table
- assign and return flows
- active assignment query helpers

Definition of done:
- current assignee can be derived from history
- assignment history is preserved
- asset status updates remain consistent

#### Slice 5: Maintenance

Deliver:
- maintenance log table and UI
- open, in-progress, and resolved flows

Definition of done:
- repairs are first-class records
- audit events are generated for maintenance actions

#### Slice 6: Files

Deliver:
- storage bucket integration
- upload metadata table
- secure access pattern

Definition of done:
- files are associated with assets
- access is not public by default unless explicitly justified

#### Slice 7: Audit and Documentation

Deliver:
- structured audit payloads
- onboarding docs
- QA instructions
- Vercel deployment notes

Definition of done:
- audit coverage exists for critical workflows
- documentation matches reality

## `/test` Phase

### Goal

Prove the implementation works with evidence.

### Minimum Evidence Required

The `/test` output must include:
- commands run
- pass or fail result for each command
- manual verification notes
- any remaining gaps
- why anything could not be tested

### Required Verification Matrix

| Area | Required Proof |
| --- | --- |
| Lint | `npm run lint` passes |
| Build | `npm run build` passes |
| Auth | admin login works, staff login works |
| RBAC | staff blocked from admin-only actions |
| Assets | create, edit, view, search work as expected |
| Assignments | assign and return behavior is correct |
| Maintenance | open and resolve flows behave correctly |
| Storage | upload and retrieval rules behave correctly |
| Audit | critical events create audit rows |
| RLS | unauthorized access attempts are rejected |

### Manual Critical Path Checklist

- sign in as admin with `admin@company.com` / `admin123`
- sign in as staff with `staff@company.com` / `staff123`
- request and complete a magic-link sign-in for an existing authorized user
- confirm admin can access `/audit`
- confirm staff cannot access `/audit`
- create an asset as admin
- edit an asset as admin
- confirm staff cannot perform asset mutation
- assign an asset to staff
- confirm assigned asset appears in the staff-visible scope
- upload a file to an asset
- create a maintenance record
- verify an audit entry exists for each critical mutation

### Definition of Done

The `/test` phase is done only when:
- proof replaces assumptions
- critical auth and RLS paths are verified
- failures are reported honestly

## `/review` Phase

### Goal

Audit the finished implementation for readability, security, maintainability, and operational safety.

### Review Checklist

- Is any auth decision enforced only in the UI?
- Is any service-role key exposed where it should not be?
- Are RLS policies overly broad?
- Are there missing indexes on high-read tables?
- Is any logic duplicated in fragile ways?
- Is the migration path reversible enough for a safe rollout?
- Are audit payloads structured and useful?
- Are error messages safe and actionable?
- Are setup docs and env docs complete?

### Anti-Patterns To Flag

- speculative abstractions
- silent security shortcuts
- hidden side effects in server actions
- overly clever query helpers
- tight coupling between auth, UI, and database details
- missing rollback guidance

### Definition of Done

The `/review` phase is done only when:
- critical and high-risk issues are either fixed or clearly documented
- code smells are identified honestly
- no false claim of production readiness remains

## `/ship` Phase

### Goal

Roll out safely to production.

### Ship Checklist

- Vercel project configured
- production environment variables set
- Supabase schema migrated
- RLS enabled in production
- required QA accounts documented for non-production environments
- preview deployment tested before promotion
- monitoring and logs checked
- rollback path documented

### Rollout Strategy

- deploy to preview first
- validate auth, asset CRUD, and audit logs in preview
- promote only after `/test` and `/review` are complete
- use feature flags for risky cutovers if auth or storage changes need staged release

### Rollback Plan

- keep the last known good Vercel deployment ready
- preserve reversible database migration steps where possible
- avoid destructive migrations until data backfill is validated
- if a cutover fails, restore traffic to the previous deployment and disable the new path

### Definition of Done

The `/ship` phase is done only when:
- production deployment is safe
- rollback steps are documented
- the team can support the release operationally

## Environment Blueprint

Recommended environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client and server Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser-safe anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only elevated operations when truly necessary |
| `NEXT_PUBLIC_SITE_URL` | canonical app URL |
| `DATABASE_URL` | optional server-only direct Postgres access if used by migration tooling |

Rules:
- never expose `SUPABASE_SERVICE_ROLE_KEY` to client code
- document every required variable in README
- separate local, preview, and production values clearly

## MVP Scope

### Must Be Included

- login and route protection
- admin and staff roles
- dashboard overview
- asset list and detail
- asset create and edit
- assignment history
- maintenance logging
- audit logging
- file upload support
- Vercel deployment documentation

### Explicitly Excluded From MVP

- barcode or QR scanning
- multi-tenant support
- workflow approval engines
- real-time subscriptions
- AI assistant features
- heavy analytics dashboards

## Definition of Done for the Project

The project is only `DONE` when all of the following are true:
- Vercel deployment is working
- Supabase Hybrid Auth is live
- Supabase Postgres schema is in place
- RLS policies are implemented and explained
- admin login works with `admin@company.com` / `admin123`
- staff login works with `staff@company.com` / `staff123`
- password and magic-link sign-in both work for authorized users
- staff is blocked from admin-only behavior
- asset workflows are verified
- maintenance and file workflows are verified
- audit logging is verified
- setup documentation is current
- `/test` evidence is shown
- `/review` findings are addressed or explicitly accepted

If `/test` and `/review` are incomplete, the correct status is `NOT READY`.

## Immediate Next Steps

1. Freeze the approved production scope in a `/spec`.
2. Decide whether the migration will remove Prisma immediately or use a short bridge.
3. Create Supabase SQL schema and RLS policies as the first build slice.
4. Replace NextAuth with Supabase Auth and re-implement protected route checks.
5. Keep seed and QA credentials aligned, with the staff account using `staff123`.
6. Move assignment history into `asset_assignments`.
7. Add maintenance and file support only after the asset core path is stable.
8. Complete `/test`, `/review`, and `/ship` before calling the migration ready.
