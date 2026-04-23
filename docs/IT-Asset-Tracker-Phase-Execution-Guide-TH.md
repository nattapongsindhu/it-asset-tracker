# IT Asset Tracker Phase Execution Guide

## วัตถุประสงค์

คู่มือฉบับนี้ใช้เพื่อควบคุมงานพัฒนาโปรเจกต์ `it-asset-tracker` ให้ทำงานอย่างเป็นระบบตั้งแต่ต้นจนจบ โดยมีเป้าหมาย 4 ข้อ:

- ช่วยให้ทีมวางแผนงานเป็น phase อย่างชัดเจน
- ลดความผิดพลาดจากการข้ามขั้นตอนหรือเดาจากข้อมูลไม่ครบ
- ทำให้งานกลับมาทำต่อได้ง่ายเมื่อหยุดกลางคัน
- ทำให้ Lead Tech และ Project Manager มองเห็นภาพรวม สถานะ และความเสี่ยงได้ตั้งแต่เริ่มจน release

เอกสารนี้ออกแบบให้ใช้ร่วมกับ workflow หลัก:
- `/spec`
- `/plan`
- `/build`
- `/test`
- `/review`
- `/ship`

## แนวทาง Auth ของโปรเจกต์นี้

- target auth ของโปรเจกต์นี้คือ `Supabase Hybrid Auth`
- ต้องรองรับทั้ง `Email + Password` และ `Magic Link`
- Magic Link ใช้ได้เฉพาะผู้ใช้ที่มีบัญชีอยู่แล้ว ไม่เปิด public signup
- credential ของ Staff สำหรับการทดสอบและ QA ใช้ `staff@company.com` / `staff123`

## หลักการควบคุมงาน

ทุก phase ต้องตอบให้ได้ 5 เรื่องเสมอ:

1. ตอนนี้เรากำลังทำ phase อะไร
2. เป้าหมายของ phase นี้คืออะไร
3. สิ่งที่ต้องส่งมอบก่อนออกจาก phase นี้มีอะไรบ้าง
4. หลักฐานที่ใช้ยืนยันว่าผ่าน phase นี้คืออะไร
5. ถ้าหยุดตอนนี้ คนถัดไปต้องรู้อะไรเพื่อทำต่อได้ทันที

## เอกสารที่ต้องอัปเดตตลอดทั้งโปรเจกต์

เพื่อให้ควบคุมงานได้จริง ต้องมี artifacts กลางต่อไปนี้เสมอ:

- `Spec / PRD`
  ระบุปัญหา ขอบเขต เป้าหมาย ข้อจำกัด และ acceptance criteria
- `Implementation Plan`
  แตกงานเป็น task เล็ก ๆ เรียงตาม dependency
- `Decision Log`
  บันทึกการตัดสินใจสำคัญ เช่น ย้าย auth, เปลี่ยน schema, ตัด feature ออกจาก MVP
- `Risk / Blocker Log`
  บันทึกความเสี่ยง สิ่งที่ติดขัด ผู้รับผิดชอบ และวันที่ต้อง follow up
- `Progress Log`
  บอกว่างานถึงขั้นไหนแล้ว อะไรเสร็จ อะไรค้าง
- `Verification Log`
  เก็บผล lint, build, test, manual QA, deployment check
- `Handoff Note`
  สรุปสถานะล่าสุดเมื่อหยุดงานกลางคัน

## ภาพรวมแต่ละ Phase

| Phase | เป้าหมาย | สิ่งที่ต้องได้ | Gate ก่อนข้าม Phase |
| --- | --- | --- | --- |
| `/spec` | ทำความเข้าใจปัญหาและกำหนดขอบเขต | Technical spec / PRD | ยังไม่เขียน code |
| `/plan` | แตกงานเป็นลำดับที่ทำได้จริง | Task list + definition of done | ทุก task ต้องมีเจ้าของและลำดับ dependency |
| `/build` | ลงมือพัฒนาเป็น slice เล็ก ๆ | Code + migration + docs ของ slice นั้น | แต่ละ slice ต้อง reversible |
| `/test` | พิสูจน์ว่างานใช้ได้จริง | หลักฐานการทดสอบ | ห้ามสรุปว่าเสร็จถ้ายังไม่มี evidence |
| `/review` | ตรวจคุณภาพและความเสี่ยง | Review findings + fixes | ห้ามปล่อยถ้ายังมี critical issue |
| `/ship` | เตรียมปล่อยขึ้น production อย่างปลอดภัย | Deployment checklist + rollback plan | ต้องมีแผน rollback และ post-release check |

## ก่อนเริ่ม Phase แรก

ก่อนเข้า `/spec` ควรมีการตั้งต้นดังนี้:

- ระบุ owner ของงาน
- ระบุ scope รอบนี้ว่าเป็น feature, migration หรือ bug fix
- ระบุ stakeholder หลัก
- ระบุ deadline หรือ milestone ถ้ามี
- ระบุ assumption ที่รู้แน่ กับ assumption ที่ต้องพิสูจน์

ผลลัพธ์ของช่วงตั้งต้น:
- ทุกคนรู้ว่า “งานรอบนี้คืออะไร”
- ทุกคนรู้ว่า “อะไรไม่อยู่ในรอบนี้”

## Phase 1: `/spec`

### เป้าหมาย

ทำให้ทุกคนเข้าใจปัญหาเดียวกันก่อนเริ่มลงมือ

### ต้องทำอะไรบ้าง

- วิเคราะห์คำขอหรือ feature request
- ตรวจ repo ปัจจุบันก่อนเสมอ
- ระบุ current state ของระบบ
- ระบุ target state ที่ต้องการ
- ระบุ scope และ out of scope
- ระบุ tech stack ที่จะใช้
- ระบุข้อจำกัดด้าน security, infra, data, auth และ deployment
- ระบุ acceptance criteria
- ระบุความเสี่ยงที่คาดว่าจะเจอ

### สิ่งที่ต้องส่งมอบ

- เอกสาร spec หรือ PRD ฉบับสั้นแต่ชัดเจน
- รายการความเสี่ยงและคำถามที่ยังไม่ปิด
- definition of done ของงานรอบนี้

### สิ่งที่ Lead Tech ต้องเห็น

- architecture direction ถูกหรือไม่
- business rule สำคัญครบหรือไม่
- มีส่วนไหนเสี่ยงต่อ migration, data loss, auth regression หรือไม่

### สิ่งที่ Project Manager ต้องเห็น

- ขอบเขตงานชัดหรือยัง
- อะไรอยู่ใน MVP
- งานนี้มี dependency กับคนหรือระบบอื่นหรือไม่
- มีความเสี่ยงต่อ timeline หรือไม่

### ห้ามทำ

- ห้ามเริ่มเขียน code
- ห้ามตัดสินใจเรื่องใหญ่โดยไม่มีเหตุผลใน spec
- ห้ามสรุป requirement เองถ้ายังไม่ได้ตรวจข้อมูลจริง

### Exit Criteria

- มี spec ที่ทุกฝ่ายอ่านแล้วเข้าใจตรงกัน
- ไม่มี ambiguity ใหญ่ที่ส่งผลต่อ implementation
- scope และ success criteria ชัดเจน

### ถ้าหยุดกลางคัน ต้องทิ้งอะไรไว้

- current phase: `/spec`
- สิ่งที่วิเคราะห์เสร็จแล้ว
- คำถามที่ยังไม่ปิด
- assumption ที่ใช้ชั่วคราว
- next step ที่ต้องทำต่อทันที

## Phase 2: `/plan`

### เป้าหมาย

เปลี่ยน spec ให้เป็นแผนทำงานที่ควบคุมได้

### ต้องทำอะไรบ้าง

- แตกงานเป็น task ย่อย
- เรียง task ตาม dependency
- แยก risky task ออกจาก low-risk task
- ระบุ file / module / schema ที่จะได้รับผลกระทบ
- ระบุ definition of done ของแต่ละ task
- ระบุวิธี verify งานของแต่ละ task
- ระบุ fallback หรือ rollback ถ้า task สำคัญพลาด

### สิ่งที่ต้องส่งมอบ

- task roadmap แบบ step-by-step
- รายการ dependency
- verification plan
- rollback note สำหรับ task เสี่ยง

### สิ่งที่ Lead Tech ต้องเห็น

- ลำดับ task ถูกต้องหรือไม่
- architecture change ถูกแยกจาก UI change หรือไม่
- migration และ auth work ถูก isolate ดีพอหรือไม่

### สิ่งที่ Project Manager ต้องเห็น

- งานแตกละเอียดพอจะ track progress ได้หรือไม่
- task ไหนเป็น milestone
- task ไหนมี dependency กับ stakeholder ภายนอก

### ห้ามทำ

- ห้ามรวมงานใหญ่หลายเรื่องไว้ใน task เดียว
- ห้ามมี task ที่ไม่สามารถบอกได้ว่า “เสร็จเมื่อไร”
- ห้าม build โดยยังไม่มี plan

### Exit Criteria

- ทุก task มี owner และ definition of done
- งานถูกเรียงตาม dependency
- ทุก slice มี verification method

### ถ้าหยุดกลางคัน ต้องทิ้งอะไรไว้

- current phase: `/plan`
- task ที่วางเสร็จแล้ว
- task ที่ยังจัด dependency ไม่จบ
- decision ที่เพิ่งเปลี่ยนจาก spec
- next task ที่ต้อง finalize

## Phase 3: `/build`

### เป้าหมาย

พัฒนาแบบ incremental โดยควบคุมความเสี่ยง

### ต้องทำอะไรบ้าง

- ลงมือทำทีละ slice ตาม plan
- จำกัด scope ของแต่ละ slice ให้เล็ก
- อัปเดต progress ทุกครั้งที่ slice จบ
- อัปเดต docs หรือ env ถ้ามีผลกระทบ
- ถ้าเจอ risk ใหม่ ให้หยุดและย้อนกลับไปปรับแผน

### แนวทางการ build ที่ดี

- ทำ foundation ก่อน เช่น schema, auth, guards, env
- ทำ read path ก่อน write path ถ้าเป็น migration
- ทำ core flow ให้เสถียรก่อน feature เสริม
- ทำของที่ reversible ก่อนของที่ destructive

### สิ่งที่ต้องส่งมอบ

- code change ของ slice นั้น
- migration หรือ config change ถ้ามี
- note ว่า slice นี้เปลี่ยนอะไร
- รายการสิ่งที่ยังไม่ verify

### สิ่งที่ Lead Tech ต้องเห็น

- implementation ตรง spec และ plan หรือไม่
- มี over-engineering หรือไม่
- มี security shortcut หรือไม่

### สิ่งที่ Project Manager ต้องเห็น

- slice ไหนเสร็จแล้ว
- percent progress เทียบกับ roadmap
- blocker ใหม่เกิดขึ้นหรือไม่

### ห้ามทำ

- ห้าม build หลาย slice พร้อมกันจน verify ไม่ได้
- ห้ามแก้เกิน scope ของ task โดยไม่อัปเดต plan
- ห้ามเปลี่ยน architecture ระหว่างทางแบบเงียบ ๆ

### Exit Criteria

- slice ที่ทำเสร็จสามารถระบุได้ชัดว่าเปลี่ยนอะไร
- มีสิ่งที่พร้อมส่งไป verify
- ยังสามารถ rollback หรือแก้ย้อนกลับได้

### ถ้าหยุดกลางคัน ต้องทิ้งอะไรไว้

- current phase: `/build`
- slice ล่าสุดที่ทำค้างอยู่
- file ที่แตะไปแล้ว
- สิ่งที่เสร็จแล้ว vs สิ่งที่ยังไม่เสร็จ
- next command หรือ next file ที่ต้องทำต่อ

## Phase 4: `/test`

### เป้าหมาย

เปลี่ยนจาก “คิดว่าน่าจะใช้ได้” เป็น “พิสูจน์แล้วว่าใช้ได้”

### ต้องทำอะไรบ้าง

- รัน lint
- รัน build
- รัน unit / integration tests ถ้ามี
- ทำ manual verification สำหรับ critical path
- ทดสอบ role-based access
- ทดสอบ regression ใน flow หลัก
- เก็บผลลัพธ์เป็นหลักฐาน

### สิ่งที่ต้องส่งมอบ

- รายการคำสั่งที่รัน
- ผล pass/fail
- รายการ manual checks
- รายการสิ่งที่ยังไม่ได้ทดสอบ
- เหตุผลถ้ามีบางอย่างทดสอบไม่ได้

### สิ่งที่ Lead Tech ต้องเห็น

- test coverage เพียงพอกับความเสี่ยงหรือไม่
- auth, data, security และ critical workflow ถูกพิสูจน์หรือยัง

### สิ่งที่ Project Manager ต้องเห็น

- งานพร้อมเข้า review หรือยัง
- มี defect ที่กระทบ timeline หรือไม่
- มี dependency ด้าน QA หรือ UAT ต่อหรือไม่

### ห้ามทำ

- ห้ามพูดว่า “เสร็จแล้ว” ถ้ายังไม่มี evidence
- ห้ามซ่อน failure
- ห้ามปล่อย critical path โดยไม่ manual verify

### Exit Criteria

- มีหลักฐานเพียงพอว่างานผ่านตาม criteria
- ความเสี่ยงที่ยังเหลือถูกระบุไว้ชัดเจน

### ถ้าหยุดกลางคัน ต้องทิ้งอะไรไว้

- current phase: `/test`
- test ที่ผ่านแล้ว
- test ที่ fail
- test ที่ยังไม่รัน
- blocker ที่ต้องแก้ก่อน rerun

## Phase 5: `/review`

### เป้าหมาย

กลั่นงานให้พร้อมใช้งานจริงทั้งด้านคุณภาพ ความปลอดภัย และการดูแลระยะยาว

### ต้องทำอะไรบ้าง

- review readability ของ code
- review security และ authorization
- review performance ที่กระทบจริง
- review maintainability
- review documentation และ onboarding
- หา code smell และ logic ที่ซับซ้อนเกินจำเป็น

### สิ่งที่ต้องส่งมอบ

- findings แบ่งตามระดับความรุนแรง
- รายการ fix ที่ทำแล้ว
- residual risk ที่ยังคงอยู่

### สิ่งที่ Lead Tech ต้องเห็น

- มี critical issue เหลืออยู่หรือไม่
- implementation ง่ายพอให้ทีม maintain ต่อหรือไม่
- architecture ยังสอดคล้องกับแนวทางที่ตกลงกันหรือไม่

### สิ่งที่ Project Manager ต้องเห็น

- มีความเสี่ยงค้างที่ต้อง approve หรือไม่
- งานพร้อมไป release หรือยัง
- มีสิ่งใดต้องสื่อสารกับ stakeholder ก่อน ship หรือไม่

### ห้ามทำ

- ห้ามมอง review เป็นแค่ formatting
- ห้ามปล่อย security gap ที่รู้แล้วแต่ไม่บันทึก
- ห้ามปิดงานโดยไม่พูดถึง residual risk

### Exit Criteria

- ไม่มี critical issue ค้างแบบไม่รู้ตัว
- findings สำคัญถูก fix หรือถูกยอมรับอย่างเป็นทางการ

### ถ้าหยุดกลางคัน ต้องทิ้งอะไรไว้

- current phase: `/review`
- finding ที่ปิดแล้ว
- finding ที่ยังค้าง
- owner ของแต่ละ issue
- decision ว่าตัวไหนต้อง fix ก่อน ship

## Phase 6: `/ship`

### เป้าหมาย

ปล่อยขึ้น production อย่างปลอดภัยและควบคุมผลกระทบได้

### ต้องทำอะไรบ้าง

- ตรวจ env และ secrets
- ตรวจ schema / migration readiness
- ตรวจ deployment config
- ตรวจ release note
- ตรวจ rollback plan
- ทำ pre-release checklist
- ทำ post-release verification

### สิ่งที่ต้องส่งมอบ

- deployment checklist
- release note
- rollback plan
- post-release verification note

### สิ่งที่ Lead Tech ต้องเห็น

- deployment เสี่ยงจุดไหน
- ถ้าพังจะย้อนกลับอย่างไร
- monitoring หรือ logs ที่ต้องจับตาหลังปล่อยมีอะไรบ้าง

### สิ่งที่ Project Manager ต้องเห็น

- release window
- dependencies ก่อนปล่อย
- stakeholder ที่ต้องได้รับแจ้ง
- status หลังปล่อย

### ห้ามทำ

- ห้ามปล่อยโดยไม่มี rollback plan
- ห้ามปล่อยโดยไม่รู้ว่าต้องเช็กอะไรหลัง release
- ห้ามถือว่า deploy สำเร็จเท่ากับใช้งานสำเร็จ

### Exit Criteria

- deploy สำเร็จ
- post-release critical path ผ่าน
- หากเกิดปัญหาก็สามารถ rollback ได้ทันที

### ถ้าหยุดกลางคัน ต้องทิ้งอะไรไว้

- current phase: `/ship`
- release step ที่ทำไปแล้ว
- release step ที่ยังไม่ทำ
- current production state
- rollback state และ decision ล่าสุด

## กฎสำคัญเมื่อหยุดงานกลางคัน

ทุกครั้งที่หยุดงาน ต้องทิ้ง `Handoff Note` ไว้อย่างน้อย 8 บรรทัดนี้:

1. Current Phase
2. Objective ของ phase นี้
3. งานที่ทำเสร็จแล้ว
4. งานที่ยังไม่เสร็จ
5. Blocker หรือ Risk ล่าสุด
6. Decision สำคัญล่าสุด
7. หลักฐานที่มีแล้ว
8. Next Step ที่ควรทำต่อทันที

## รูปแบบ Handoff Note ที่แนะนำ

```md
## Handoff Note
- Current Phase: /build
- Current Slice: Auth migration guard update
- Done: server auth helper, route guard, session role mapping
- Not Done: staff restriction check on /audit
- Blocker: need final decision on staff asset visibility scope
- Latest Decision: keep Supabase Hybrid Auth as target, no Prisma bridge for auth
- Evidence: lint passed, manual login test pending
- Next Step: finish /audit authorization check, then run /test
```

## รูปแบบ Weekly / Status Update สำหรับ Lead Tech และ PM

ใช้ format นี้เพื่อให้เห็นภาพงานตั้งแต่ต้นจนจบ:

```md
## Status Update
- Current Phase:
- Completed This Period:
- In Progress:
- Next Phase Gate:
- Risks / Blockers:
- Decisions Needed:
- ETA to Next Milestone:
```

## Checklist สำหรับควบคุมคุณภาพทั้งโปรเจกต์

- ทุก phase มี owner ชัดเจน
- ทุก phase มี exit criteria
- ทุก phase มี evidence
- ทุก phase มี handoff note เมื่อหยุดงาน
- ทุก decision สำคัญถูกบันทึก
- ทุก blocker มี owner และ target date
- ทุก release มี rollback plan

## วิธีใช้เอกสารนี้กับ Lead Tech และ Project Manager

### สำหรับ Lead Tech

ใช้เอกสารนี้เพื่อตรวจ:
- technical direction
- risk ของ architecture
- quality gate ก่อนปล่อยแต่ละ phase
- readiness ก่อน ship

### สำหรับ Project Manager

ใช้เอกสารนี้เพื่อตรวจ:
- scope control
- phase progress
- milestone readiness
- blocker และ dependency
- communication plan ก่อน release

## สรุปสั้น

ถ้าต้องการควบคุมโปรเจกต์ให้ไม่หลุดทาง ต้องยึด rule ง่าย ๆ นี้:

- `Spec ก่อน Build`
- `Build ทีละ Slice`
- `ทุก Slice ต้อง Verify`
- `Review ก่อน Ship`
- `หยุดเมื่อไรก็ต้องทิ้ง Handoff Note`

เมื่อทำครบตามนี้ โปรเจกต์จะเดินต่อได้แม้เปลี่ยนคนทำ เปลี่ยนรอบงาน หรือหยุดกลางคัน และทำให้ทั้ง Lead Tech กับ Project Manager เห็นภาพเดียวกันตั้งแต่เริ่มจนจบ
