# IT Asset Tracker Lite

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-22C55E?style=flat-square)

> Internal web application for tracking IT assets — laptops, monitors, keyboards, and accessories — with role-based access control, audit logging, and full-text search.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 — App Router, Server Actions |
| Language | TypeScript |
| Styling | Tailwind CSS |
| ORM / DB | Prisma 5 + SQLite |
| Auth | NextAuth.js v4 — Credentials provider, JWT sessions |
| Security | bcryptjs (password hashing), Zod (server-side validation) |

---

## Local Setup

```bash
git clone https://github.com/nattapongsindhu/it-asset-tracker.git
cd it-asset-tracker
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

App runs at `http://localhost:3000`

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@company.com | admin123 |
| Staff | staff@company.com | staff123 |

---

## Routes

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Credential login |
| `/dashboard` | All users | Asset counts by status |
| `/assets` | All users | Asset list + search |
| `/assets/new` | Admin only | Create asset |
| `/assets/[id]` | All users | Asset detail |
| `/assets/[id]/edit` | Admin only | Edit asset |
| `/audit` | Admin only | Audit log — last 200 entries |

---

## Security

- Passwords hashed with bcryptjs (cost factor 10)
- JWT session strategy — no session DB table required
- Middleware guards all routes under `/dashboard`, `/assets`, `/audit`
- Server Actions re-verify auth and role before every mutation
- Staff role cannot create, edit, or delete assets — enforced server-side
- Audit log restricted to Admin
- Notes rendered as plain text (`whitespace-pre-wrap`) — no `innerHTML`, no XSS surface
- All form input validated with Zod before DB writes
- `.env` contains secrets — never commit to version control

---

## Roadmap

- [ ] Pagination — assets list and audit log
- [ ] Bulk import via CSV
- [ ] Email notifications for warranty expiry
- [ ] Asset history and assignment timeline
- [ ] Staff view limited to assigned assets only
- [ ] Password reset flow
- [ ] PostgreSQL migration for production
