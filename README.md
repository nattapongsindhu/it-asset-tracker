# IT Asset Tracker Lite

Internal web app for tracking IT assets — laptops, monitors, keyboards, and accessories.

## Stack

- Next.js 14 (App Router, Server Actions)
- TypeScript
- Tailwind CSS
- Prisma 5 + SQLite
- NextAuth.js v4 (Credentials provider, JWT sessions)
- bcryptjs (password hashing)
- Zod (server-side validation)

## Local Setup

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open http://localhost:3000

## Demo Credentials

| Role  | Email               | Password   |
|-------|---------------------|------------|
| Admin | admin@company.com   | admin123   |
| Staff | staff@company.com   | staff123   |

## Security Decisions

- Passwords hashed with bcryptjs (cost factor 10)
- Sessions use JWT strategy — no session DB table needed
- Middleware protects all routes under `/dashboard`, `/assets`, `/audit`
- Server actions re-check auth and role before every mutation
- Staff role cannot create, edit, or delete assets (redirected server-side)
- Audit log is admin-only
- Notes rendered as plain text (`whitespace-pre-wrap`) — no innerHTML, no XSS risk
- All form input validated with Zod on the server before touching the DB
- `.env` contains secrets — never commit it

## Pages

| Route              | Access      | Description              |
|--------------------|-------------|--------------------------|
| /login             | Public      | Credential login         |
| /dashboard         | All users   | Asset counts by status   |
| /assets            | All users   | Asset list + search      |
| /assets/new        | Admin only  | Create asset             |
| /assets/[id]       | All users   | Asset detail             |
| /assets/[id]/edit  | Admin only  | Edit asset               |
| /audit             | Admin only  | Audit log (last 200)     |

## Future Improvements

- Pagination on assets list and audit log
- Bulk import via CSV
- Email notifications for warranty expiry
- Asset history / assignment timeline
- Staff can view only their assigned assets (tighter access control)
- Password reset flow
- PostgreSQL migration for production
