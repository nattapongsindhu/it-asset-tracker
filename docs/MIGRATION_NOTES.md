# IT Asset Tracker Portfolio Lite Migration Notes

## Current Stack Inventory

| Area | Current State |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth v4 with Credentials provider and JWT sessions |
| Passwords | `bcryptjs` password hash comparison against `User.passwordHash` |
| Database | Prisma 5 with SQLite (`prisma/dev.db`) |
| Data Models | `User`, `Asset`, `AuditLog` |
| Validation | Zod in server actions |
| Runtime Shape | Mostly server-rendered pages plus a few client components |
| Deployment Assumption | Local-first only; no real Supabase or Vercel integration yet |

## Phase 1 Dependency Changes

### New Packages Needed

- `@supabase/supabase-js`
- `@supabase/ssr`

### Legacy Packages Marked To-Remove

- `next-auth`
- `prisma`
- `@prisma/client`

## Current Architecture Snapshot

### Main Routes

| Route | Purpose | Notes |
|---|---|---|
| `/` | Redirect entrypoint | Sends signed-in users to `/dashboard`, otherwise `/login` |
| `/login` | Credentials sign-in | Client page using `next-auth/react` `signIn` |
| `/dashboard` | Asset status counts | Server component with Prisma count queries |
| `/assets` | Asset list | Server component with basic search/filter query params |
| `/assets/new` | New asset form | Admin-only page |
| `/assets/[id]` | Asset detail | Shows assignment, dates, and notes |
| `/assets/[id]/edit` | Edit asset | Admin-only page |
| `/audit` | Audit log | Admin-only page showing latest 200 entries |
| `/api/auth/[...nextauth]` | NextAuth handler | Required for current auth flow |

### Data Layer

- Prisma client is created in `lib/prisma.ts`
- Route files and server actions call Prisma directly; there is no repository/service layer
- `app/actions/assets.ts` owns create, update, and delete mutations
- `lib/audit.ts` is a tiny helper that inserts audit rows through Prisma
- Seed data lives in `prisma/seed.ts`

### Auth Layer

- `lib/auth.ts` defines NextAuth credentials auth
- Login is Email/password only today
- Session strategy is JWT
- Roles are injected into the JWT and session object through callbacks
- `middleware.ts` re-exports `next-auth/middleware` and protects `/dashboard`, `/assets`, and `/audit`
- `app/providers.tsx` wraps the app in `SessionProvider`

### Deployment Assumptions Today

- `.env` points at `DATABASE_URL="file:./dev.db"`
- `.env` also expects `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
- `README.md` assumes local development on port `3001`
- There is no Supabase config, SQL migration set, or Vercel-specific runtime setup in the app
- The current stack depends on a local writable SQLite file, which is not suitable for Vercel deployment

## Legacy Dependencies to Remove

| Package or Asset | Status | Why It Goes |
|---|---|---|
| `next-auth` | To-remove | Replaced by Supabase Auth |
| `@prisma/client` | To-remove | Replaced by Supabase Postgres access |
| `prisma` | To-remove | No longer needed once Prisma schema/migrations are retired |
| `bcryptjs` | Later review | Password hashing is handled by Supabase Auth |
| `@types/bcryptjs` | Later review | Only needed because of `bcryptjs` |
| `prisma/schema.prisma` | To-remove | Legacy schema source once Supabase SQL becomes the source of truth |
| `prisma/migrations/*` | To-remove | Legacy SQLite migration history |
| `prisma/dev.db` | To-remove | Local-only database artifact |
| `prisma/seed.ts` | To-remove | Must be replaced with Supabase-compatible seed/bootstrap approach |
| `types/next-auth.d.ts` | To-remove | Auth session typing changes with Supabase |

## Files and Modules Likely Affected

| File or Area | Why It Will Change |
|---|---|
| `package.json` | Dependency and script changes |
| `.env` | Replace NextAuth/SQLite vars with Supabase/Vercel-friendly env vars |
| `middleware.ts` | Replace NextAuth middleware with Supabase session handling |
| `lib/auth.ts` | Remove credentials provider logic and replace with Supabase auth helpers |
| `lib/prisma.ts` | Remove Prisma singleton |
| `lib/audit.ts` | Rework to insert through Supabase/Postgres |
| `app/providers.tsx` | Remove `SessionProvider` or replace with lighter client/session setup |
| `app/page.tsx` | Session lookup and redirect logic changes |
| `app/login/page.tsx` | Replace `next-auth/react` sign-in flow |
| `app/dashboard/page.tsx` | Replace Prisma count queries |
| `app/assets/page.tsx` | Replace Prisma list/filter queries |
| `app/assets/new/page.tsx` | Replace user lookup for assignment select |
| `app/assets/[id]/page.tsx` | Replace Prisma detail query |
| `app/assets/[id]/edit/page.tsx` | Replace Prisma data loading and bound action dependencies |
| `app/actions/assets.ts` | Largest migration point: auth checks, validation, transactions, and writes |
| `app/audit/page.tsx` | Replace audit query and role gate dependencies |
| `app/components/Nav.tsx` | Session source changes |
| `app/components/SignOutButton.tsx` | Sign-out implementation changes |
| `app/components/AssetForm.tsx` | Remove direct Prisma model typing from props |
| `app/api/auth/[...nextauth]/route.ts` | Remove entirely after auth swap |
| `types/next-auth.d.ts` | Remove or replace with app-level auth/profile types |
| `README.md` | Setup instructions and stack description will need refresh in a later phase |

## Migration Risks

- Direct Prisma usage is spread across route files, so migration is not isolated to one module
- Current auth is tightly coupled to NextAuth session helpers and middleware behavior
- Current seeded users rely on local password hashes and will not carry over directly to Supabase Auth
- The current schema uses `cuid()` ids, while Supabase-auth-backed user/profile relations are usually `uuid` based
- Asset assignment and audit log foreign keys need a clean target schema before code migration starts
- Hybrid auth introduces two flows to test: Magic Link and Email/Password
- Public Magic Link access needs a later-phase hard cap of 10 total users to control spam
- If the app keeps any hidden local-file assumptions, Vercel deployment will break even if the code compiles

## Recommended Migration Order

1. Keep the auth target locked to hybrid Magic Link plus Email/Password.
2. Define the target Supabase/Postgres schema for `profiles`, `assets`, and `audit_logs`.
3. Introduce shared app-level types and Supabase helpers so UI code no longer depends on Prisma model types.
4. Replace auth/session flow: login page, callback handling, sign-out, and middleware behavior.
5. Migrate read paths next: dashboard, assets list, asset detail, and audit log.
6. Migrate write paths after that: create, edit, delete, assignment, and audit writes.
7. Add the Magic Link public-user cap before calling auth work complete.
8. Remove NextAuth, Prisma, SQLite artifacts only after the new paths are working.
9. Update docs, environment setup, seed/bootstrap story, and Vercel deployment guidance.

## Recommendation for Phase 1

- Start with foundation work, not UI redesign
- Preserve route names and most component structure
- Create a small shared data/auth layer before touching every page
- Keep the Lite schema intentionally small and aligned with the current three-domain model: users/profiles, assets, audit logs
