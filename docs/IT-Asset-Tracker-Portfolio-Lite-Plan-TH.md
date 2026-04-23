# IT Asset Tracker Portfolio Lite Plan

แผนพัฒนาแบบย่อสำหรับงาน Portfolio ด้วย Next.js, Supabase และ Vercel

Project: it-asset-tracker

Goal: สร้าง internal tool เวอร์ชันเล็กที่ดูจริง ใช้งานได้ และ deploy ได้

Target stack: Next.js 14 + TypeScript + Tailwind + Supabase Auth/Postgres + Vercel

Estimated effort: 18-30 ชั่วโมง หรือประมาณ 2-3 สัปดาห์ที่ทำวันละ 2 ชั่วโมง

## ภาพรวม

- Portfolio Lite คือเวอร์ชันที่ลด scope จาก production-grade blueprint ให้เล็กพอจะทำจบ แต่ยังดู mature กว่า CRUD demo ทั่วไป
- แนวทางนี้เหมาะถ้าต้องการงานโชว์ที่ต่อยอดจาก Trip-Planner โดยยังคงจุดแข็งเรื่อง full-stack, auth, RLS และ deployment จริง
- โฟกัสหลักคือ role-based internal tool: admin และ staff, dashboard, asset CRUD, assignment แบบพื้นฐาน, audit log แบบพื้นฐาน และการ deploy บน Vercel

## In Scope

- Supabase Auth แบบ email/password
- ADMIN และ STAFF roles
- Dashboard แสดงจำนวน asset ตาม status
- Assets list, detail, create, edit, delete
- Assignment แบบพื้นฐานผ่าน assigned_user_id
- Basic audit log สำหรับ login, create, edit, delete และ assign
- README, architecture summary, security summary และ deployment-ready setup

## Out of Scope

- Magic link
- Invite flow สำหรับสร้างผู้ใช้จาก UI
- File uploads และ Supabase Storage
- Maintenance workflow
- Print system ทุกหน้า
- Rate limiting เต็มระบบ
- Rollback runbook ระดับ production

## Timeline รวมโดยประมาณ

- Phase 0: 1-2 ชั่วโมง
- Phase 1: 2-3 ชั่วโมง
- Phase 2: 3-4 ชั่วโมง
- Phase 3: 3-4 ชั่วโมง
- Phase 4: 6-8 ชั่วโมง
- Phase 5: 2-3 ชั่วโมง
- Phase 6: 2-4 ชั่วโมง
- Final: 1-2 ชั่วโมง
- รวม: 18-30 ชั่วโมง

## Phase 0 - Reset and Decide

### เป้าหมาย

ล็อก scope ให้เล็กและชัดก่อนเริ่ม build

### สิ่งที่ต้องทำ

- ตรวจ repo ปัจจุบันและสรุป architecture เดิม
- กำหนด Lite Scope ให้ชัดว่าเอาอะไรและไม่เอาอะไร
- ตัดสินใจว่าจะย้ายจาก Prisma, SQLite และ NextAuth ไปสู่ Supabase stack
- เขียนเอกสารสั้น เช่น docs/LITE_SCOPE.md และ docs/MIGRATION_NOTES.md

### Deliverables

- LITE_SCOPE.md
- MIGRATION_NOTES.md

### เวลาโดยประมาณ

1-2 ชั่วโมง

### ความเสี่ยง

- ถ้า scope phase นี้ไม่ชัด โปรเจกต์จะบวมกลับไปเหมือน full blueprint

### Exit Criteria

- ทีมรู้ชัดว่ากำลังทำ portfolio-lite ไม่ใช่ production rewrite เต็มรูปแบบ

## Phase 1 - Foundation

### เป้าหมาย

ตั้งฐาน Supabase และ Vercel ให้พร้อมสำหรับการพัฒนาต่อ

### สิ่งที่ต้องทำ

- สร้าง Supabase project และ Vercel project
- ตั้งค่า env สำหรับ URL, anon key, service role key และ site URL
- ติดตั้งและ wire @supabase/supabase-js กับ @supabase/ssr
- สร้าง browser client, server client และ middleware สำหรับ refresh session
- อัปเดต .env.example และเอกสาร setup แบบย่อ

### Deliverables

- Supabase client factories
- middleware.ts ที่ใช้งานกับ Supabase SSR
- .env.example ที่อัปเดตแล้ว
- SETUP_LITE.md

### เวลาโดยประมาณ

2-3 ชั่วโมง

### ความเสี่ยง

- env ผิดหรือ redirect URL ผิด
- SSR cookies และ middleware wiring ผิดจน auth เพี้ยน

### Exit Criteria

- แอป build ได้บน foundation ใหม่ หรือมี placeholder state ที่ build ผ่าน
- preview deployment พร้อมเชื่อม env ได้

## Phase 2 - Schema and RLS Lite

### เป้าหมาย

มี schema ที่พอใช้จริงและปลอดภัยพอสำหรับ portfolio-lite

### สิ่งที่ต้องทำ

- สร้างตาราง profiles, assets และ audit_logs
- ใส่ timestamps, constraints และ indexes ที่จำเป็น
- เขียน RLS policies สำหรับ self-read และ admin-read-all ใน profiles
- ให้ staff อ่าน assets ได้ แต่ admin เขียนได้ครบ
- ให้ audit_logs เป็น admin read only
- กำหนด default accounts สำหรับ admin และ staff

### Deliverables

- Supabase migrations
- DEFAULT_ACCOUNTS.md
- SCHEMA_LITE.md ถ้าต้องการ

### เวลาโดยประมาณ

3-4 ชั่วโมง

### ความเสี่ยง

- RLS เข้มเกินไปจน admin ใช้งานไม่ได้
- RLS หลวมเกินไปจน staff เห็นข้อมูลเกิน scope

### Exit Criteria

- schema อยู่ใน repo และ policy อธิบายได้ชัด
- default users พร้อมใช้งานใน environment พัฒนา

## Phase 3 - Auth and Guards

### เป้าหมาย

ผู้ใช้ล็อกอินได้และ protected routes ปลอดภัยที่ฝั่ง server

### สิ่งที่ต้องทำ

- สร้างหน้า /login แบบ email/password
- ทำ sign-out flow
- สร้าง helper เช่น requireUser() และ requireAdmin()
- ป้องกัน routes สำคัญ: /dashboard, /assets, /assets/new, /assets/[id], /assets/[id]/edit และ /audit
- ทำให้ logged-out users ถูกส่งกลับ /login และ staff เข้า /audit ไม่ได้

### Deliverables

- Working login page
- Guard helpers
- AUTH_LITE.md

### เวลาโดยประมาณ

3-4 ชั่วโมง

### ความเสี่ยง

- session และ cookie ฝั่ง SSR เพี้ยน
- guard ไม่ครอบบาง route แล้วเกิด authorization leak

### Exit Criteria

- admin และ staff login ได้
- route protection ทำงานที่ server layer

## Phase 4 - Dashboard and Asset CRUD

### เป้าหมาย

ให้ flow หลักของระบบ asset tracker ใช้งานได้จริง

### สิ่งที่ต้องทำ

- สร้าง /dashboard พร้อม status counts
- สร้าง /assets พร้อม search และ basic filters
- สร้าง /assets/new, /assets/[id] และ /assets/[id]/edit
- ให้ ADMIN create, edit และ delete ได้
- ให้ STAFF ดูข้อมูลได้แบบ read-only
- render notes เป็น plain text อย่างปลอดภัย
- เขียน audit logs สำหรับ login, create, edit และ delete

### Deliverables

- Dashboard
- Asset list
- Asset detail
- Create/edit forms
- Delete flow
- Audit writes สำหรับ mutations หลัก

### เวลาโดยประมาณ

6-8 ชั่วโมง

### ความเสี่ยง

- form validation ไม่ครบ
- staff เห็นปุ่มหรือ action ที่ไม่ควรเห็น
- mutation บางจุดลืมเขียน audit log

### Exit Criteria

- admin ทำ asset CRUD ได้ครบ
- staff เปิดดู asset ได้แต่แก้ไขไม่ได้

## Phase 5 - Basic Assignment

### เป้าหมาย

เพิ่ม workflow ที่ทำให้โปรเจกต์ดูเป็น internal tool จริงมากขึ้น

### สิ่งที่ต้องทำ

- ใช้ assigned_user_id บน assets เพื่อรองรับ assignment แบบพื้นฐาน
- ให้ admin assign asset ให้ staff และ clear assignment ได้
- อัปเดต status เป็น ASSIGNED เมื่อมี assigned user
- อัปเดต status เป็น IN_STOCK เมื่อ clear assignment
- แสดง assignment information ใน asset detail
- เขียน audit log สำหรับ assign และ unassign

### Deliverables

- Assignment controls ใน UI
- Asset detail ที่มี assignment state
- Audit coverage สำหรับ assignment events

### เวลาโดยประมาณ

2-3 ชั่วโมง

### ความเสี่ยง

- status drift ถ้า update assignment กับ asset ไม่พร้อมกัน
- assign ไปยัง user ที่ไม่ถูกต้องถ้า validation ไม่ครบ

### Exit Criteria

- admin assign และ unassign ได้ clean
- staff เห็นสถานะการถูก assign อย่างถูกต้อง

## Phase 6 - Portfolio Polish

### เป้าหมาย

ทำให้ repo อ่านง่าย ดูน่าเชื่อถือ และพร้อมใช้เป็น portfolio

### สิ่งที่ต้องทำ

- ปรับ empty states, loading states และ error states
- rewrite README.md ให้เล่า project ได้ชัด
- เขียน ARCHITECTURE_LITE.md และ SECURITY_LITE.md
- อธิบาย auth flow, role model, RLS และ tradeoffs แบบสั้นและชัด
- เพิ่ม screenshots หรือ screenshot placeholders

### Deliverables

- README เวอร์ชัน portfolio
- Architecture summary
- Security summary
- Screenshots หรือ placeholders

### เวลาโดยประมาณ

2-4 ชั่วโมง

### ความเสี่ยง

- ใช้เวลากับ docs มากเกินไป
- polish จน scope บวม

### Exit Criteria

- คนที่ไม่เคยเห็น repo นี้มาก่อนเปิดอ่านแล้วเข้าใจได้เร็ว

## Final - Ship

### เป้าหมาย

deploy ขึ้นจริงและตรวจ critical path ให้พร้อมโชว์

### สิ่งที่ต้องทำ

- ตั้ง production env บน Vercel
- ตรวจ redirect URLs และ Supabase settings
- deploy production
- ตรวจ critical path: admin login, staff login, create asset, edit asset, assign asset, staff view asset, admin view audit และ staff blocked from audit
- เก็บ screenshots สุดท้ายและสรุป verification

### Deliverables

- Production-ready repo
- DEPLOY_LITE.md
- Final verification summary

### เวลาโดยประมาณ

1-2 ชั่วโมง

### ความเสี่ยง

- env production ผิดหรือชี้ไป Supabase ผิด project
- login redirect หรือ site URL ตั้งไม่ตรง production domain

### Exit Criteria

- โปรเจกต์ live, deployable และพร้อมใช้เป็น portfolio piece

## ข้อแนะนำสุดท้าย

ถ้าเป้าหมายคือทำโปรเจกต์ให้เสร็จ deploy จริง และใช้สมัครงานได้เร็ว แผน Portfolio Lite เหมาะกว่าการทำ full production-grade blueprint ตั้งแต่รอบแรก เพราะยังคงจุดแข็งด้าน full-stack, auth, RLS และ role-based UX โดยไม่แบกรับ scope ที่ใหญ่เกินจำเป็น
