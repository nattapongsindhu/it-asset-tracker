# IT Asset Tracker

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Production-black?style=flat-square&logo=vercel)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)
![Status](https://img.shields.io/badge/Status-Production_Ready-22C55E?style=flat-square)

> ระบบบริหารจัดการทรัพย์สินไอทีสำหรับงาน internal operations ที่ต้องการความชัดเจนเรื่องผู้ถือครองอุปกรณ์, การย้ายตำแหน่ง, ประวัติการซ่อม, warranty visibility, และ audit trail แบบ production-grade

Production: [it-asset-tracker-silk.vercel.app](https://it-asset-tracker-silk.vercel.app)

อ้างอิงสถานะเอกสาร: **April 25, 2026**  
สถานะล่าสุดของระบบ: **Phase 4 Completed**

หมายเหตุ: badge `SQLite` ยังคงไว้เพื่อสะท้อนประวัติของโปรเจกต์ แต่ runtime ปัจจุบันเป็น **Supabase-first** และ Prisma runtime ถูกถอดออกจาก active stack แล้ว

---

## Project Overview

`IT Asset Tracker` ถูกออกแบบมาเพื่อแทน workflow แบบ manual หรือ spreadsheet ในงาน IT operations ที่ต้องติดตามว่า:

- อุปกรณ์ชิ้นไหนอยู่กับใคร
- ตอนนี้เครื่องอยู่ location ไหน
- เครื่องเคยผ่านการซ่อมหรือย้ายมือเมื่อไร
- ใครเป็นคนทำ action สำคัญในระบบ

สถาปัตยกรรมปัจจุบันใช้ `Next.js App Router + Supabase + Vercel` โดยเน้น:

- `Accountability`: ตรวจสอบย้อนหลังได้จริง
- `Atomic Workflows`: assignment, repair, และ lifecycle สำคัญทำผ่าน RPC
- `Operational Intelligence`: มี warranty alerts, maintenance logs, search, bulk actions, และ monthly report

คู่มือฉบับเต็ม: [docs/HANDBOOK.md](docs/HANDBOOK.md)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 App Router | UI, routing, server components, server actions |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Responsive UI และ visual system |
| Auth | Supabase Auth | Email/password และ magic link |
| Database | Supabase PostgreSQL | Assets, profiles, locations, maintenance, audit |
| Security | Supabase RLS | Role-aware access control |
| Validation | Zod | Form and action validation |
| Hosting | Vercel | Production deployment |

---

## Phased Development Summary

| Phase | Focus | Outcome |
|---|---|---|
| Phase 1 | Infrastructure & Core UI | Supabase auth, dashboard, CSV export, audit UI, analytics foundation |
| Phase 2 | Operations | assignment workflow, location tracking, lifecycle flows, My Assets |
| Phase 3 | Intelligence | warranty alerts, maintenance logs, repair history, global search |
| Phase 4 | Hardening | bulk move/status actions, monthly maintenance report, login polish, favicon |

---

## Key Features

- Dashboard analytics พร้อม category summary และ warranty watch
- Asset Assignment แบบ assign, reassign, return to stock พร้อม history
- Location Tracking แบบรายเครื่องและ bulk move
- Maintenance Logs พร้อม technician, cost, notes, และ repair history
- Warranty Alerts สำหรับเครื่องที่หมดประกันหรือใกล้หมดภายใน 30 วัน
- Staff-facing `My Assets` และ `Request Repair`
- Global Search จาก `asset_tag`, `serial_number`, และ `model`
- Bulk Actions สำหรับเปลี่ยน status และ location หลายเครื่องพร้อมกัน
- Monthly Maintenance CSV Report
- Audit Log สำหรับ action สำคัญและ admin cleanup controls

---

## Core Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Sign-in entrypoint |
| `/dashboard` | Admin | Executive snapshot และ analytics |
| `/dashboard/assets` | Admin | Inventory, filters, bulk actions, exports |
| `/assets` | Staff / Admin | Staff sees `My Assets`, admin uses detail navigation |
| `/assets/[id]` | Authenticated | Asset detail, assignment, maintenance, lifecycle |
| `/audit` | Admin | Audit review และ cleanup |

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/nattapongsindhu/it-asset-tracker.git
cd it-asset-tracker
npm install
```

### 2. Configure environment

คัดลอก `.env.example` ไปเป็น `.env.local` แล้วใส่ค่า:

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

### 4. Build check

```bash
npm run build
```

---

## Deployment Notes

- ใช้ `Vercel` สำหรับ production hosting
- ใช้ `supabase db push --yes` สำหรับ apply migrations ไปยัง remote project
- auth redirect และ callback path ต้องอิง `lib/site-url.ts`
- หลีกเลี่ยงการ hardcode `localhost` ใน redirect flow
- ควรรัน `npm run build` ก่อน push production ทุกครั้ง

---

## Timezone & Data Integrity

### Timezone

- timestamp ถูกเก็บในฐานข้อมูลตามมาตรฐาน
- การแสดงผลใน UI ใช้ browser timezone ของผู้ใช้ผ่าน `LocalizedDateTime`
- reference timezone ของรอบพัฒนาหลักคือ `America/Los_Angeles`

### Data Integrity

- `public.asset_assignments` และ `public.maintenance_logs` เก็บ history แยกจาก asset หลัก
- เมื่อ asset ถูกลบ `asset_id` จะใช้แนวคิด `set null on delete`
- มี snapshot fields เช่น `asset_tag_snapshot` เพื่อรักษาบริบทสำหรับ audit และ history

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

## Pros & Constraints

### Pros

- Supabase-first stack ดูแลง่ายและต้นทุนเริ่มต้นต่ำ
- RPC-based workflows ช่วยลดข้อมูลครึ่งสำเร็จครึ่งล้มเหลว
- Audit trail ครอบคลุมงาน operations สำคัญ
- Admin และ Staff แยกสิทธิ์ชัดเจน
- พร้อมใช้งานจริงสำหรับ internal asset operations

### Constraints

- ยังเป็น single-tenant oriented system
- reporting ยังเน้น CSV export มากกว่า BI dashboard เต็มรูปแบบ
- email alerts และ scheduled automation ยังเป็น roadmap

---

## Documentation

- Full handbook: [docs/HANDBOOK.md](docs/HANDBOOK.md)
- Setup notes: [docs/SETUP_LITE.md](docs/SETUP_LITE.md)
- Migration notes: [docs/MIGRATION_NOTES.md](docs/MIGRATION_NOTES.md)

---

## License

MIT
