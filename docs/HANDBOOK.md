# IT Asset Tracker Handbook

คู่มือฉบับสมบูรณ์สำหรับโปรเจกต์ `IT Asset Tracker`  
อ้างอิงสถานะระบบ: **April 25, 2026**

Production URL: [https://it-asset-tracker-silk.vercel.app](https://it-asset-tracker-silk.vercel.app)

---

## 1. Vision & Context

โปรเจกต์นี้ถูกออกแบบมาสำหรับหน่วยงานที่มี workflow เชิง operations ชัดเจน เช่นสำนักงาน, hub, repair bench, หรือ internal IT support team ที่ต้องส่งมอบเครื่องให้พนักงานแบบต่อเนื่อง

วิสัยทัศน์ของระบบมี 3 แกนหลัก:

1. `Accountability`
ระบบต้องตอบได้ว่าอุปกรณ์ชิ้นไหนอยู่กับใคร, อยู่ location ไหน, ผ่านการซ่อมหรือเปลี่ยนสถานะเมื่อไร, และใครเป็นคนทำ action นั้น

2. `Atomic Transactions`
workflow สำคัญ เช่น assign, return, move to repair, decommission, maintenance logging ต้องไม่ทิ้งข้อมูลครึ่งสำเร็จครึ่งล้มเหลว

3. `Operational Intelligence`
ระบบไม่ควรเป็นแค่ inventory list แต่ต้องช่วยมองเห็นความเสี่ยง เช่น warranty ใกล้หมด, ค่าใช้จ่ายการซ่อม, movement history, และสถานะที่ต้องจัดการด่วน

สรุปสั้นที่สุด:

> ระบบนี้ถูกสร้างมาเพื่อเปลี่ยนการจัดการ asset จาก manual spreadsheet ไปสู่ digital operations workflow ที่ตรวจสอบย้อนหลังได้จริง

---

## 2. Project Overview

`IT Asset Tracker` เป็น web application สำหรับบริหารจัดการทรัพย์สินไอที โดยใช้ `Next.js App Router + Supabase + Vercel` เป็น platform หลัก

ลักษณะการทำงานโดยรวม:

- ผู้ใช้ login ผ่าน `Supabase Auth`
- middleware ตรวจสิทธิ์ก่อนเข้าหน้าภายใน
- role ใน `public.profiles` กำหนดว่าเป็น `ADMIN` หรือ `STAFF`
- `ADMIN` จัดการ inventory, assignment, movement, repair, retirement, bulk actions, reports
- `STAFF` เห็นเฉพาะ asset ที่ตัวเองถืออยู่ และส่ง repair request ได้
- action สำคัญถูกบันทึกลง `public.audit_logs`

หมายเหตุเชิงสถาปัตยกรรม:

- โปรเจกต์นี้ไม่ใช้ Prisma runtime ใน active stack แล้ว
- Supabase คือ source of truth หลักของ auth, database, RPC, และ RLS
- Next.js ถูกใช้ทั้งในส่วนของ server components และ server actions ไม่ใช่ client-side only app

---

## 3. Tech Stack & Tools

| หมวด | เครื่องมือ | หน้าที่ |
|---|---|---|
| Framework | Next.js 14 App Router | routing, server components, server actions, middleware |
| Language | TypeScript | type safety และ maintainability |
| Styling | Tailwind CSS | layout, spacing, responsive UI |
| Auth | Supabase Auth | email/password และ magic link |
| Database | Supabase PostgreSQL | assets, profiles, locations, assignments, maintenance, audit |
| Security | Supabase RLS | role-aware access control |
| Validation | Zod | validate input ใน actions และ forms |
| Icons | Lucide React | UI iconography |
| Hosting | Vercel | production deployment และ preview environments |

---

## 4. High-Level Architecture

| Layer | Responsibility |
|---|---|
| `app/*` | routes, page composition, forms, and user-facing UI |
| `app/actions/assets.ts` | asset workflows, lifecycle, bulk actions, repair flows |
| `lib/supabase/session.ts` | session lookup, user role resolution, route guards |
| `middleware.ts` | auth redirect และ access gate ระดับ route |
| `lib/site-url.ts` | absolute URL helper และ safe redirect path |
| `lib/audit.ts` | helper สำหรับบันทึก audit log |
| `supabase/migrations/*` | schema, policies, RPC functions |

Behavior flow แบบย่อ:

1. ผู้ใช้เปิดหน้าใน Next.js
2. route ถูกตรวจสิทธิ์ผ่าน middleware และ session helpers
3. form action หรือ UI event เรียก server action
4. server action เรียก `supabase.rpc(...)` หรือ query โดยตรง
5. DB บันทึก asset state, history, และ audit
6. UI ถูก revalidate และแสดงผลตาม browser timezone

---

## 5. Database Model Summary

### 5.1 Core Tables

| Table | Purpose |
|---|---|
| `public.profiles` | profile ผู้ใช้และ role |
| `public.assets` | asset หลักของระบบ |
| `public.asset_assignments` | ประวัติ check-in / check-out และ reassignment |
| `public.locations` | จุดเก็บเครื่อง, อาคาร, floor, หรือ hub |
| `public.maintenance_logs` | ประวัติการซ่อม, ค่าใช้จ่าย, technician, notes |
| `public.audit_logs` | action trail สำหรับงานสำคัญ |

### 5.2 Data Integrity Strategy

หลักการสำคัญของระบบคือ history ต้องไม่หายง่าย

- `asset_assignments.asset_id` ใช้แนวคิด `set null on delete`
- `maintenance_logs.asset_id` ใช้แนวคิด `set null on delete`
- ตาราง history เก็บ `asset_tag_snapshot` ไว้ด้วย

ผลลัพธ์:

- asset หลักอาจถูกลบออกจาก inventory ได้
- แต่ assignment history และ maintenance history ยังอยู่
- เหมาะกับการ audit, post-incident review, และ handover ระยะยาว

---

## 6. Authentication, Authorization, and RLS

### 6.1 Authentication

ระบบรองรับ:

- Email / Password
- Magic Link

### 6.2 Role Model

| Role | สิทธิ์หลัก |
|---|---|
| `ADMIN` | จัดการ inventory, assignments, lifecycle, reports, audit |
| `STAFF` | ดู `My Assets` และส่ง repair request |

### 6.3 Guard Layers

- `middleware.ts` ป้องกัน public/private routes
- `requireSupabaseUser()` ใช้บังคับว่า route นี้ต้อง login
- `requireSupabaseAdmin()` ใช้บังคับว่า route นี้ต้องเป็น admin
- `RLS` ป้องกันอีกชั้นในระดับ database

### 6.4 Redirect Rules

เรื่อง redirect และ callback path ต้องยึด:

- `lib/site-url.ts`
- `getURL()`
- `getSafeRedirectPath()`

ข้อห้าม:

- ห้าม hardcode `localhost` ใน auth callback flow
- ห้ามทำ redirect path แบบรับค่าตรงโดยไม่ sanitize

---

## 7. Phased Development Summary

| Phase | Theme | Deliverables |
|---|---|---|
| Phase 1 | Infrastructure & Core UI | Supabase auth, dashboard, analytics foundation, CSV export, audit UI |
| Phase 2 | Operations | assignments, locations, lifecycle, My Assets, data integrity upgrades |
| Phase 3 | Intelligence | warranty alerts, maintenance logs, repair history, search |
| Phase 4 | Hardening | bulk actions, monthly report, login polish, favicon, production cleanup |

### Phase 1

- เปลี่ยนจาก Prisma runtime ไปสู่ Supabase-first architecture
- ทำ auth, role, และ dashboard flow ให้ใช้งานจริง
- สร้าง audit UI, print cleanup, CSV export, analytics foundation

### Phase 2

- สร้าง assignment workflow แบบมี history จริง
- เพิ่ม location tracking
- เพิ่ม staff-facing `My Assets`
- ทำ lifecycle control เช่น repair, return, retire
- ปรับ delete strategy เพื่อรักษา history

### Phase 3

- สร้าง warranty alerts
- สร้าง maintenance logs พร้อม cost tracking
- เพิ่ม repair history panel
- เพิ่ม global search

### Phase 4

- เพิ่ม bulk move location
- เพิ่ม bulk change status
- เพิ่ม monthly maintenance report CSV
- polish login page และเพิ่ม favicon
- เก็บ production hardening รอบสุดท้าย

---

## 8. Key Features

### 8.1 Dashboard

- summary cards ตามสถานะ asset
- category analytics
- searchable inventory snapshot
- warranty watch summary

### 8.2 Asset Assignment

- assign
- reassign
- return to stock
- assignment history ต่อเครื่อง
- audit logging

### 8.3 Location Tracking

- current location ใน asset record
- move location แบบรายเครื่อง
- bulk move location
- audit `ASSET_MOVED`

### 8.4 Maintenance & Repair

- repair intake ผ่าน RPC
- maintenance log พร้อม `technician_name`, `cost`, `notes`
- repair history panel
- monthly maintenance CSV report

### 8.5 Warranty Alerts

- แยก `Expired`
- แยก `Due In 30 Days`
- แสดง `Time Remaining`

### 8.6 Global Search

ค้นหาแบบ case-insensitive จาก:

- `asset_tag`
- `serial_number`
- `model`

### 8.7 Bulk Actions

- bulk change status
- bulk move location
- export filtered asset list เป็น CSV

---

## 9. Installation & Local Development

### 9.1 Clone Repository

```bash
git clone https://github.com/nattapongsindhu/it-asset-tracker.git
cd it-asset-tracker
```

### 9.2 Install Dependencies

```bash
npm install
```

### 9.3 Environment Variables

คัดลอก `.env.example` ไปเป็น `.env.local` แล้วตั้งค่า:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### 9.4 Run Development Server

```bash
npm run dev
```

ค่าเริ่มต้น:

- App URL: `http://localhost:3001`
- Login URL: `http://localhost:3001/login`

### 9.5 Build Check

```bash
npm run build
```

---

## 10. Deployment to Production

### 10.1 Vercel Flow

1. push branch หรือ `main` ขึ้น GitHub
2. Vercel trigger deployment อัตโนมัติ
3. ตรวจให้ deployment status เป็น `Ready`
4. smoke test หน้า login, dashboard, inventory, และ repair/report flow

### 10.2 Supabase Flow

schema ใช้ migrations เป็น source of truth

```bash
supabase db push --yes
```

### 10.3 Recommended Release Checklist

1. รัน `npm run build`
2. apply migration ที่เกี่ยวข้อง
3. push code ขึ้น `main`
4. รอ Vercel deploy สำเร็จ
5. ทดสอบ smoke test สั้น ๆ บน production

---

## 11. User Manual

### 11.1 Admin Workflow

Admin สามารถ:

- ดู dashboard และ analytics
- ค้นหา asset จาก tag / serial / model
- เพิ่ม / แก้ไข / ลบ asset
- assign / reassign / return asset
- ย้าย location
- ส่งเครื่องเข้า repair
- บันทึก maintenance log
- decommission asset
- ใช้ bulk actions
- export CSV
- ดูและล้าง audit log

ตัวอย่าง admin flow:

1. เปิด `/dashboard/assets`
2. ค้นหา asset ที่ต้องการ
3. เข้า asset detail
4. assign ให้พนักงาน หรือย้ายเข้า repair
5. บันทึก maintenance log
6. export report สิ้นเดือน

### 11.2 Staff Workflow

Staff สามารถ:

- login
- เข้า `/assets`
- ดูเฉพาะ asset ที่ตัวเองถืออยู่
- เปิด asset detail
- กด `Request Repair`

ข้อจำกัดของ staff:

- ไม่เห็น asset ของคนอื่น
- ไม่มี bulk actions
- ไม่มีสิทธิ์เข้าหน้า `/audit`
- ไม่สามารถแก้ lifecycle หรือ maintenance log ได้เอง

---

## 12. Timezone Strategy

ระบบใช้แนวคิดดังนี้:

- เก็บ timestamp ใน database ตามมาตรฐาน
- render เวลาใน UI ตาม browser timezone ของผู้ใช้
- ใช้ `LocalizedDateTime` เป็น component กลาง

reference timezone ของรอบพัฒนาหลักคือ:

- `America/Los_Angeles`

ผลดี:

- ผู้ใช้เห็นเวลาตามเครื่องของตนเอง
- ลดความสับสนเวลาทำงานข้าม time zone
- warranty remaining logic สอดคล้องกับวันที่ผู้ใช้เห็นจริง

หน้าที่ได้รับผลจาก strategy นี้:

- asset detail timestamps
- audit log timestamps
- assignment history
- maintenance logs
- warranty time remaining

---

## 13. Audit Strategy

ตัวอย่าง action ที่ระบบบันทึก:

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

แนวคิดหลัก:

- ระบบต้องตอบได้ว่าใครทำอะไร เมื่อไร กับ asset ใด
- bulk move จะ log แยกเป็นรายเครื่อง
- audit page เป็นทั้ง operational review tool และ compliance trail แบบ lightweight

---

## 14. Pros & Cons

### 14.1 Pros

| จุดแข็ง | รายละเอียด |
|---|---|
| Atomic workflows | assignment, repair, และ lifecycle สำคัญใช้ RPC และ transaction-aware logic |
| Zero-cost friendly stack | Next.js + Supabase + Vercel เหมาะกับต้นทุนเริ่มต้นต่ำ |
| Audit-ready | action สำคัญถูกบันทึกไว้ครบ |
| Practical operations focus | assignment, movement, maintenance, warranty ใช้งานจริงได้ |
| Clear role separation | admin vs staff แยกสิทธิ์ชัดเจน |

### 14.2 Constraints

| ข้อจำกัด | รายละเอียด |
|---|---|
| Single-tenant orientation | ยังไม่ใช่ enterprise multi-tenant platform |
| CSV-centric reporting | reporting ยังเน้น export มากกว่า BI dashboard เชิงลึก |
| Alert automation ยังไม่เต็ม | email / scheduled alerts ยังเป็น roadmap |
| Mobile-first field workflow ยังพัฒนาได้อีก | current UI ใช้งานได้ แต่ยังไม่ถึงระดับ scanner-native app |

---

## 15. Future Roadmap

แนวทางต่อยอดที่แนะนำ:

1. QR Code / Barcode lookup
2. automated warranty และ repair SLA alerts
3. scheduled recurring reports
4. advanced audit explorer พร้อม filters ละเอียด
5. department-level permission model
6. depreciation tracking และ maintenance cost analytics เชิงลึก

---

## 16. Handover Notes

สิ่งที่ทีมรับช่วงต่อควรรู้:

- ห้ามย้อนกลับไปใช้ Prisma runtime เว้นแต่มีคำสั่งชัดเจน
- งานที่แตะ auth redirect ต้องยึด `lib/site-url.ts`
- assignment ต้องอิง `assigned_user_id -> profiles.id`
- workflow สำคัญควรวิ่งผ่าน RPC มากกว่า query หลายก้อน
- ถ้าจะแก้ delete behavior ของ history ต้องระวัง integrity ของ `asset_assignments` และ `maintenance_logs`

release checklist แบบสั้น:

```bash
npm run build
supabase db push --yes
git push origin main
```

---

## 17. Final Status

ณ วันที่ `April 25, 2026` โปรเจกต์นี้อยู่ในสถานะ:

- production deployed
- phase 1 completed
- phase 2 completed
- phase 3 completed
- phase 4 completed

สรุปสั้นที่สุด:

> ระบบพร้อมใช้งานจริงสำหรับ internal IT operations ระดับ production-grade ในองค์กรขนาดเล็กถึงกลาง ที่ต้องการความชัดเจนเรื่อง assignment, location, maintenance, warranty, และ auditability
