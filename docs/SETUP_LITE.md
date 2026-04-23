# IT Asset Tracker Lite Setup

## Clone and Install

```bash
git clone <your-repo-url>
cd it-asset-tracker
npm install
```

The project now builds against Supabase only. Prisma is no longer part of the setup.

## Create a Supabase Project

1. Create a new Supabase project.
2. In the Supabase dashboard, copy:
   - Project URL
   - Anon key
   - Service role key
3. In Auth settings, set the site URL for local development and production.
4. Add redirect URLs for:
   - `http://localhost:3001/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
5. Enable both Email/Password and Magic Link auth providers.

Notes:
- The public Magic Link user cap and role-aware auth behavior are handled in later phases.
- Default Admin and Staff accounts are project requirements, but they are not provisioned by this Phase 1 foundation step.

## Set `.env.local`

Copy `.env.example` to `.env.local`, then fill in the Supabase values:

```bash
cp .env.example .env.local
```

Required Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

## Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3001/login](http://localhost:3001/login).

## Deploy to Vercel

1. Import the repository into Vercel.
2. Add the same Supabase environment variables in Vercel project settings.
3. Set `NEXT_PUBLIC_SITE_URL` to your Vercel production URL.
4. Add the production callback URL in Supabase Auth settings.
5. Deploy normally from Vercel.
