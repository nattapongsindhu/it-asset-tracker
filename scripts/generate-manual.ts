import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, TableOfContents, StyleLevel, LevelFormat,
  NumberFormat, convertInchesToTwip, PageBreak, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType,
} from 'docx'
import * as fs from 'fs'
import * as path from 'path'

// ─── helpers ──────────────────────────────────────────────────────────────────

function h1(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  })
}

function h2(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  })
}

function h3(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  })
}

function p(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 160 },
  })
}

function bullet(text: string, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level },
    spacing: { after: 80 },
  })
}

function bold(text: string) {
  return new TextRun({ text, bold: true, size: 22 })
}

function note(text: string) {
  return new Paragraph({
    children: [
      new TextRun({ text: '📌 หมายเหตุ: ', bold: true, size: 22, color: '0070C0' }),
      new TextRun({ text, size: 22, color: '0070C0' }),
    ],
    spacing: { after: 160 },
  })
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}

function tableHeader(cells: string[]) {
  return new TableRow({
    children: cells.map(text =>
      new TableCell({
        children: [new Paragraph({ children: [bold(text)], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.CLEAR, fill: '2B579A' },
        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
      })
    ),
  })
}

function tableRow(cells: string[]) {
  return new TableRow({
    children: cells.map(text =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, size: 20 })] })],
        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
      })
    ),
  })
}

// ─── document ─────────────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'TH Sarabun New', size: 22 },
      },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 32, bold: true, color: '1F3864', font: 'TH Sarabun New' },
        paragraph: { spacing: { before: 400, after: 200 } },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 28, bold: true, color: '2B579A', font: 'TH Sarabun New' },
        paragraph: { spacing: { before: 300, after: 150 } },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 24, bold: true, color: '2E74B5', font: 'TH Sarabun New' },
        paragraph: { spacing: { before: 200, after: 100 } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.25),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: [

        // ── Cover ──────────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: '', break: 6 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'คู่มือการใช้งาน', bold: true, size: 52, font: 'TH Sarabun New', color: '1F3864' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'ระบบบริหารจัดการทรัพย์สิน IT', bold: true, size: 44, font: 'TH Sarabun New', color: '2B579A' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'IT Asset Tracker Lite', size: 32, font: 'TH Sarabun New', color: '595959' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `เวอร์ชัน 1.0  |  ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22, font: 'TH Sarabun New', color: '595959' })],
          alignment: AlignmentType.CENTER,
        }),
        pageBreak(),

        // ── 1. บทนำ ────────────────────────────────────────────────────────────
        h1('1. บทนำและประโยชน์ของระบบ'),
        p('ระบบ IT Asset Tracker Lite เป็นเว็บแอปพลิเคชันสำหรับใช้งานภายในองค์กร ออกแบบมาเพื่อช่วยทีม IT Support และ Help Desk ในการบริหารจัดการทรัพย์สินด้านเทคโนโลยีสารสนเทศได้อย่างมีประสิทธิภาพ ไม่ว่าจะเป็น คอมพิวเตอร์โน้ตบุ๊ก จอมอนิเตอร์ คีย์บอร์ด เมาส์ หรืออุปกรณ์เสริมอื่น ๆ'),

        h2('1.1 ประโยชน์หลักของระบบ'),
        bullet('ติดตามสถานะทรัพย์สินแบบ Real-time ว่าอยู่ในคลัง ถูกมอบหมาย กำลังซ่อม หรือปลดระวางแล้ว'),
        bullet('บันทึกข้อมูลครบถ้วน ทั้ง Asset Tag, ยี่ห้อ, รุ่น, หมายเลขซีเรียล และวันหมดประกัน'),
        bullet('มอบหมายทรัพย์สินให้พนักงานได้ง่ายและรวดเร็ว'),
        bullet('ค้นหาและกรองข้อมูลได้ทันที'),
        bullet('บันทึก Audit Log ทุกการกระทำสำคัญ เพื่อความโปร่งใสและตรวจสอบได้'),
        bullet('แบ่งสิทธิ์การใช้งานระหว่าง Admin และ Staff ชัดเจน'),

        h2('1.2 สิทธิ์การใช้งาน'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['สิทธิ์', 'ความสามารถ']),
            tableRow(['Admin', 'ดู / เพิ่ม / แก้ไข / ลบ Asset, ดู Audit Log, มอบหมายงาน']),
            tableRow(['Staff', 'ดูรายการ Asset และรายละเอียดเท่านั้น']),
          ],
        }),
        new Paragraph({ spacing: { after: 200 } }),

        pageBreak(),

        // ── 2. การเข้าสู่ระบบ ──────────────────────────────────────────────────
        h1('2. การเข้าสู่ระบบ'),
        p('ระบบใช้การยืนยันตัวตนแบบ Hybrid Auth รองรับทั้ง Email + Password และ Magic Link สำหรับผู้ใช้ที่มีบัญชีอยู่แล้ว โดยไม่ต้องติดตั้งแอปพลิเคชันเพิ่มเติม และสามารถใช้งานผ่านเบราว์เซอร์ได้ทันที'),

        h2('2.1 ขั้นตอนการเข้าสู่ระบบ'),
        bullet('เปิดเบราว์เซอร์แล้วไปที่ URL ของระบบ เช่น http://localhost:3000'),
        bullet('กรอก Email ในช่อง "Email"'),
        bullet('หากต้องการเข้าสู่ระบบด้วยรหัสผ่าน ให้กรอก Password ในช่อง "Password" แล้วคลิกปุ่ม "Sign in"'),
        bullet('หากต้องการเข้าสู่ระบบแบบไม่ใช้รหัสผ่าน ให้คลิกปุ่ม "Send magic link" และเปิดลิงก์จากอีเมลที่ได้รับ'),
        bullet('Magic Link ใช้ได้เฉพาะบัญชีที่มีอยู่แล้วในระบบ'),
        bullet('เมื่อยืนยันตัวตนสำเร็จ ระบบจะพาไปยังหน้า Dashboard ทันที'),

        h2('2.2 บัญชีทดสอบเริ่มต้น'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['Role', 'Email', 'Password']),
            tableRow(['Admin', 'admin@company.com', 'admin123']),
            tableRow(['Staff', 'staff@company.com', 'staff123']),
          ],
        }),
        new Paragraph({ spacing: { after: 160 } }),
        note('กรุณาเปลี่ยน Password ก่อนนำระบบขึ้น Production จริง'),

        h2('2.3 การออกจากระบบ'),
        p('คลิกปุ่ม "Sign out" ที่มุมขวาบนของทุกหน้า ระบบจะล้าง Session และพากลับไปหน้า Login ทันที'),

        pageBreak(),

        // ── 3. Dashboard ──────────────────────────────────────────────────────
        h1('3. Dashboard'),
        p('หน้า Dashboard เป็นหน้าแรกหลังจากเข้าสู่ระบบ แสดงภาพรวมสถานะของทรัพย์สินทั้งหมดในองค์กร'),

        h2('3.1 ข้อมูลที่แสดงบน Dashboard'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['การ์ด', 'ความหมาย']),
            tableRow(['Total Assets', 'จำนวน Asset ทั้งหมดในระบบ']),
            tableRow(['In Stock', 'Asset ที่อยู่ในคลัง พร้อมใช้งาน']),
            tableRow(['Assigned', 'Asset ที่มอบหมายให้พนักงานแล้ว']),
            tableRow(['In Repair', 'Asset ที่ส่งซ่อมอยู่']),
            tableRow(['Retired', 'Asset ที่ปลดระวางแล้ว']),
          ],
        }),
        new Paragraph({ spacing: { after: 160 } }),
        p('สามารถคลิกที่การ์ดแต่ละใบเพื่อกรองรายการ Asset ตามสถานะนั้น ๆ ได้ทันที'),

        pageBreak(),

        // ── 4. การดูรายการ Assets ─────────────────────────────────────────────
        h1('4. การดูรายการ Assets'),
        p('หน้า Assets แสดงรายการทรัพย์สินทั้งหมดในรูปแบบตาราง พร้อมฟังก์ชันค้นหาและกรองข้อมูล'),

        h2('4.1 การค้นหา'),
        p('พิมพ์คำค้นหาในช่อง Search แล้วคลิกปุ่ม "Filter" ระบบจะค้นหาจาก:'),
        bullet('Asset Tag (รหัสทรัพย์สิน)'),
        bullet('Brand (ยี่ห้อ)'),
        bullet('Model (รุ่น)'),
        bullet('Serial Number (หมายเลขซีเรียล)'),

        h2('4.2 การกรองข้อมูล'),
        p('สามารถกรองพร้อมกันได้หลายเงื่อนไข:'),
        bullet('กรองตาม Status: All statuses / In Stock / Assigned / In Repair / Retired'),
        bullet('กรองตาม Type: ประเภทอุปกรณ์ เช่น Laptop, Monitor, Keyboard'),
        bullet('คลิก "Clear" เพื่อล้างตัวกรองทั้งหมด'),

        h2('4.3 ข้อมูลในตาราง'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['คอลัมน์', 'คำอธิบาย']),
            tableRow(['Tag', 'รหัส Asset — คลิกเพื่อดูรายละเอียด']),
            tableRow(['Type', 'ประเภทอุปกรณ์']),
            tableRow(['Brand / Model', 'ยี่ห้อและรุ่น']),
            tableRow(['Status', 'สถานะปัจจุบัน']),
            tableRow(['Assigned To', 'ชื่อพนักงานที่รับผิดชอบ']),
            tableRow(['Warranty', 'วันหมดประกัน']),
          ],
        }),
        new Paragraph({ spacing: { after: 200 } }),

        pageBreak(),

        // ── 5. การเพิ่ม Asset ใหม่ ────────────────────────────────────────────
        h1('5. การเพิ่ม Asset ใหม่'),
        note('ฟังก์ชันนี้ใช้ได้เฉพาะ Admin เท่านั้น'),

        h2('5.1 ขั้นตอนการเพิ่ม Asset'),
        bullet('ไปที่หน้า Assets'),
        bullet('คลิกปุ่ม "+ New Asset" ที่มุมขวาบน'),
        bullet('กรอกข้อมูลในแบบฟอร์ม'),
        bullet('คลิกปุ่ม "Save" เพื่อบันทึก'),

        h2('5.2 คำอธิบายฟิลด์'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['ฟิลด์', 'จำเป็น', 'คำอธิบาย']),
            tableRow(['Asset Tag', '✓', 'รหัสประจำทรัพย์สิน ต้องไม่ซ้ำกัน เช่น LT-001']),
            tableRow(['Type', '✓', 'ประเภทอุปกรณ์ เช่น Laptop, Monitor, Keyboard']),
            tableRow(['Brand', '✓', 'ยี่ห้อ เช่น Dell, Lenovo, LG']),
            tableRow(['Model', '✓', 'รุ่น เช่น Latitude 5540']),
            tableRow(['Serial Number', '-', 'หมายเลขซีเรียลจากผู้ผลิต']),
            tableRow(['Status', '✓', 'In Stock / Assigned / In Repair / Retired']),
            tableRow(['Assign To', '-', 'มอบหมายให้พนักงาน (สถานะเปลี่ยนเป็น Assigned อัตโนมัติ)']),
            tableRow(['Warranty Expiry', '-', 'วันหมดประกัน']),
            tableRow(['Notes', '-', 'หมายเหตุเพิ่มเติม สูงสุด 2,000 ตัวอักษร']),
          ],
        }),
        new Paragraph({ spacing: { after: 160 } }),
        note('หากเลือก "Assign To" ระบบจะเปลี่ยนสถานะเป็น "Assigned" ให้อัตโนมัติ'),

        h2('5.3 การแสดงข้อผิดพลาด'),
        p('หากกรอกข้อมูลไม่ครบหรือ Asset Tag ซ้ำกัน ระบบจะแสดงข้อความแจ้งเตือนสีแดงด้านบนฟอร์ม โดยไม่สูญเสียข้อมูลที่กรอกไว้'),

        pageBreak(),

        // ── 6. การดูรายละเอียด Asset ──────────────────────────────────────────
        h1('6. การดูรายละเอียด Asset'),
        p('คลิกที่ Asset Tag (ลิงก์สีน้ำเงิน) ในตารางรายการเพื่อดูข้อมูลทั้งหมดของ Asset นั้น'),

        h2('6.1 ข้อมูลที่แสดง'),
        bullet('Asset Tag, Type, Brand, Model, Serial Number'),
        bullet('Status ปัจจุบัน'),
        bullet('ชื่อและ Email ของพนักงานที่รับผิดชอบ (ถ้ามี)'),
        bullet('วันหมดประกัน'),
        bullet('วันที่สร้างและวันที่แก้ไขล่าสุด'),
        bullet('Notes (แสดงเป็น Plain Text ปลอดภัยจาก XSS)'),

        h2('6.2 ปุ่มดำเนินการ (Admin เท่านั้น)'),
        bullet('ปุ่ม "Edit" — ไปยังหน้าแก้ไข Asset'),
        bullet('ปุ่ม "Delete" — ลบ Asset (มีการยืนยันก่อนลบ)'),

        pageBreak(),

        // ── 7. การแก้ไข Asset ─────────────────────────────────────────────────
        h1('7. การแก้ไข Asset'),
        note('ฟังก์ชันนี้ใช้ได้เฉพาะ Admin เท่านั้น'),

        h2('7.1 ขั้นตอนการแก้ไข'),
        bullet('เปิดหน้ารายละเอียด Asset ที่ต้องการแก้ไข'),
        bullet('คลิกปุ่ม "Edit" ที่มุมขวาบน'),
        bullet('แก้ไขข้อมูลที่ต้องการในฟอร์ม'),
        bullet('คลิกปุ่ม "Save" เพื่อบันทึก'),

        h2('7.2 หมายเหตุสำคัญ'),
        bullet('การเปลี่ยน "Assign To" เป็นพนักงาน — ระบบจะเปลี่ยนสถานะเป็น Assigned อัตโนมัติ'),
        bullet('การล้างช่อง "Assign To" (เลือก Unassigned) — หากสถานะยังเป็น Assigned ระบบจะเปลี่ยนเป็น In Stock อัตโนมัติ'),
        bullet('ทุกการแก้ไขจะถูกบันทึกใน Audit Log ทันที'),

        pageBreak(),

        // ── 8. การลบ Asset ────────────────────────────────────────────────────
        h1('8. การลบ Asset'),
        note('ฟังก์ชันนี้ใช้ได้เฉพาะ Admin เท่านั้น และไม่สามารถกู้คืนได้'),

        h2('8.1 ขั้นตอนการลบ'),
        bullet('เปิดหน้ารายละเอียด Asset ที่ต้องการลบ'),
        bullet('คลิกปุ่ม "Delete" (สีแดง)'),
        bullet('ระบบจะแสดงกล่องยืนยัน "Delete asset [TAG]? This cannot be undone."'),
        bullet('คลิก "OK" เพื่อยืนยันการลบ หรือ "Cancel" เพื่อยกเลิก'),
        bullet('หากยืนยัน ระบบจะลบ Asset และบันทึกใน Audit Log ทันที แล้วกลับไปหน้ารายการ'),

        h2('8.2 ข้อควรระวัง'),
        p('การลบ Asset ไม่สามารถกู้คืนได้ ควรตรวจสอบให้แน่ใจก่อนดำเนินการ หากต้องการ "เลิกใช้งาน" โดยยังเก็บประวัติไว้ ให้เปลี่ยนสถานะเป็น "Retired" แทน'),

        pageBreak(),

        // ── 9. Audit Log ──────────────────────────────────────────────────────
        h1('9. Audit Log'),
        note('หน้านี้แสดงได้เฉพาะ Admin เท่านั้น'),

        p('Audit Log บันทึกทุกการกระทำสำคัญในระบบ เพื่อความโปร่งใสและสามารถตรวจสอบย้อนหลังได้'),

        h2('9.1 การเข้าถึง Audit Log'),
        bullet('คลิก "Audit Log" ในเมนูนำทางด้านบน (แสดงเฉพาะ Admin)'),
        bullet('ระบบแสดงรายการล่าสุด 200 รายการ เรียงจากใหม่ไปเก่า'),

        h2('9.2 ข้อมูลในตาราง'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['คอลัมน์', 'คำอธิบาย']),
            tableRow(['Time', 'วันเวลาที่เกิดเหตุการณ์']),
            tableRow(['User', 'ชื่อผู้ใช้ที่ดำเนินการ']),
            tableRow(['Action', 'ประเภทการกระทำ']),
            tableRow(['Detail', 'รายละเอียดเพิ่มเติม']),
          ],
        }),
        new Paragraph({ spacing: { after: 160 } }),

        h2('9.3 ประเภทการกระทำที่บันทึก'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['Action', 'ความหมาย']),
            tableRow(['LOGIN', 'ผู้ใช้เข้าสู่ระบบ']),
            tableRow(['CREATE_ASSET', 'สร้าง Asset ใหม่']),
            tableRow(['EDIT_ASSET', 'แก้ไขข้อมูล Asset']),
            tableRow(['DELETE_ASSET', 'ลบ Asset']),
          ],
        }),
        new Paragraph({ spacing: { after: 200 } }),

        pageBreak(),

        // ── 10. Admin vs Staff ─────────────────────────────────────────────────
        h1('10. ความแตกต่างสิทธิ์ Admin และ Staff'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['ฟังก์ชัน', 'Admin', 'Staff']),
            tableRow(['เข้าสู่ระบบ', '✓', '✓']),
            tableRow(['ดู Dashboard', '✓', '✓']),
            tableRow(['ดูรายการ Asset', '✓', '✓']),
            tableRow(['ค้นหาและกรอง Asset', '✓', '✓']),
            tableRow(['ดูรายละเอียด Asset', '✓', '✓']),
            tableRow(['เพิ่ม Asset ใหม่', '✓', '✗']),
            tableRow(['แก้ไข Asset', '✓', '✗']),
            tableRow(['ลบ Asset', '✓', '✗']),
            tableRow(['มอบหมาย Asset ให้พนักงาน', '✓', '✗']),
            tableRow(['ดู Audit Log', '✓', '✗']),
          ],
        }),
        new Paragraph({ spacing: { after: 200 } }),

        h2('10.1 หมายเหตุด้านความปลอดภัย'),
        bullet('การตรวจสอบสิทธิ์ทำทั้งฝั่ง UI และ Server ไม่สามารถเลี่ยงได้'),
        bullet('Staff ที่พยายามเข้าถึงหน้า Admin จะถูก Redirect กลับทันที'),
        bullet('Session หมดอายุโดยอัตโนมัติเมื่อปิดเบราว์เซอร์'),

        pageBreak(),

        // ── คำถามที่พบบ่อย ─────────────────────────────────────────────────────
        h1('11. คำถามที่พบบ่อย (FAQ)'),

        h3('Q: ลืม Password ทำอย่างไร?'),
        p('A: หากบัญชีของคุณมีอีเมลอยู่ในระบบ สามารถใช้ Magic Link เพื่อเข้าสู่ระบบได้ทันทีในกรณีที่ไม่สะดวกรหัสผ่าน หากยังต้องการรีเซ็ต Password ให้ติดต่อ Admin โดยตรง เนื่องจากระบบยังไม่มีฟังก์ชัน "Forgot Password" แบบ self-service ในหน้าเว็บ'),

        h3('Q: Asset Tag ซ้ำกันได้ไหม?'),
        p('A: ไม่ได้ ระบบบังคับให้ Asset Tag ต้องไม่ซ้ำกันในทุก Asset หากพยายามบันทึก Asset Tag ซ้ำ จะได้รับข้อความแจ้งเตือน'),

        h3('Q: ถ้าต้องการเลิกใช้งาน Asset แต่ยังเก็บประวัติไว้ ทำอย่างไร?'),
        p('A: เปลี่ยนสถานะเป็น "Retired" แทนการลบ ข้อมูลจะยังอยู่ในระบบและสามารถค้นหาได้'),

        h3('Q: Audit Log เก็บข้อมูลนานแค่ไหน?'),
        p('A: ระบบเก็บทุก Log ไว้ในฐานข้อมูล และแสดงผล 200 รายการล่าสุดในหน้า Audit Log'),

        h3('Q: Staff มองเห็น Asset ของคนอื่นได้ไหม?'),
        p('A: ได้ Staff สามารถดูรายการ Asset ทั้งหมดได้ แต่ไม่สามารถแก้ไขหรือลบได้'),

        new Paragraph({ spacing: { after: 400 } }),

        // Footer
        new Paragraph({
          children: [
            new TextRun({ text: 'IT Asset Tracker Lite — คู่มือการใช้งาน v1.0', size: 18, color: '595959', font: 'TH Sarabun New' }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
        }),
      ],
    },
  ],
})

// ─── output ───────────────────────────────────────────────────────────────────

async function main() {
  const outDir = path.join(process.cwd(), 'docs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  const buffer = await Packer.toBuffer(doc)
  const outPath = path.join(outDir, 'คู่มือการใช้งาน IT Asset Tracker.docx')
  fs.writeFileSync(outPath, buffer)
  console.log(`✓ Generated: ${outPath}`)
}

main().catch(console.error)
