import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from 'docx'
import * as fs from 'fs'
import * as path from 'path'

function heading(text: string, level: HeadingLevel) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 260, after: 120 },
  })
}

function body(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 140 },
  })
}

function bullet(text: string, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level },
    spacing: { after: 70 },
  })
}

function tableHeader(cells: string[]) {
  return new TableRow({
    children: cells.map((text) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 22 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { fill: '1F4E79' },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
    ),
  })
}

function tableRow(cells: string[]) {
  return new TableRow({
    children: cells.map((text) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, size: 21 })] })],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
    ),
  })
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: 'TH Sarabun New',
          size: 24,
        },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'CDC: Protecting Americans through Global Health', bold: true, size: 34, color: '1F4E79' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'สรุปรายละเอียดวิดีโอฉบับภาษาไทย', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 220 },
        }),
        body(
          'เอกสารนี้เป็นสรุปภาษาไทยของวิดีโอ CDC เรื่อง "Protecting Americans through Global Health" โดยเรียบเรียงใหม่ให้อ่านง่าย เน้นประเด็นสำคัญ ข้อเท็จจริงหลัก ตัวอย่างโรคที่กล่าวถึง และความเชื่อมโยงกับการป้องกันโรคในระดับบุคคล ชุมชน และนานาชาติ'
        ),

        heading('1. ข้อมูลวิดีโอ', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['รายการ', 'รายละเอียด']),
            tableRow(['ชื่อวิดีโอ', 'CDC: Protecting Americans through Global Health']),
            tableRow(['ผู้เผยแพร่', 'Centers for Disease Control and Prevention (CDC)']),
            tableRow(['ลิงก์ YouTube', 'https://www.youtube.com/watch?v=IsITU2RLEo4']),
            tableRow(['แหล่ง transcript หลักของ CDC', 'https://archive.cdc.gov/www_cdc_gov/globalhealth/video/globalhealth/globalhealth.htm']),
            tableRow(['หัวข้อหลัก', 'การที่งานด้าน global health ช่วยป้องกันโรคและปกป้องชาวอเมริกันทั้งในและนอกประเทศ']),
          ],
        }),

        heading('2. ใจความสำคัญของวิดีโอ', HeadingLevel.HEADING_1),
        body(
          'วิดีโอนี้อธิบายว่า การป้องกันโรคไม่ได้หยุดอยู่ที่พรมแดนของประเทศ เพราะโรคติดต่อสามารถเดินทางข้ามประเทศได้อย่างรวดเร็วผ่านการเดินทางของผู้คน CDC จึงเน้นว่าหนึ่งในวิธีที่ดีที่สุดในการปกป้องคนอเมริกัน คือการช่วยตรวจจับและควบคุมโรคตั้งแต่ต้นทางก่อนที่โรคจะขยายวงกว้าง'
        ),
        body(
          'วิดีโอนำเสนอว่า global health ไม่ใช่แค่งานช่วยเหลือด้านมนุษยธรรมเท่านั้น แต่ยังเป็นยุทธศาสตร์ด้านความปลอดภัยทางสุขภาพของสหรัฐฯ ด้วย เมื่อประเทศต่าง ๆ มีระบบเฝ้าระวังโรค การรักษา การฉีดวัคซีน และระบบสาธารณสุขที่ดีขึ้น ความเสี่ยงที่โรคระบาดจะลุกลามมาถึงสหรัฐฯ ก็ลดลงตามไปด้วย'
        ),

        heading('3. สรุปรายละเอียดของวิดีโอ', HeadingLevel.HEADING_1),
        heading('3.1 ภารกิจด้าน Global Health ของ CDC', HeadingLevel.HEADING_2),
        bullet('CDC ทำงานอย่างต่อเนื่องเพื่อปกป้องชาวอเมริกันจากโรคต่าง ๆ รวมถึงโรคที่เริ่มต้นในต่างประเทศ'),
        bullet('CDC มีผู้เชี่ยวชาญทำงานอยู่มากกว่า 50 ประเทศ'),
        bullet('เป้าหมายคือ ตรวจจับและควบคุมการระบาดให้ได้ตั้งแต่ต้นทาง'),
        bullet('ตาม transcript ของวิดีโอ ในปี 2011 CDC ตอบสนองต่อการระบาดและเหตุฉุกเฉินเกือบ 250 เหตุการณ์ใน 20 ประเทศ'),

        heading('3.2 ตัวอย่างจาก Kibera ในนครไนโรบี ประเทศเคนยา', HeadingLevel.HEADING_2),
        body(
          'วิดีโอยกตัวอย่าง Kibera ซึ่งเป็นชุมชนแออัดขนาดใหญ่ในไนโรบี ประเทศเคนยา พื้นที่ลักษณะนี้มีความเสี่ยงต่อการแพร่กระจายของโรคสูง เพราะมีปัญหาเรื่องความแออัด สุขาภิบาล และทรัพยากรด้านสุขภาพไม่เพียงพอ เมื่อผู้คนในชุมชนเคลื่อนย้ายไปทำงานหรือเดินทาง โรคก็สามารถกระจายไปยังส่วนอื่น ๆ ของเมือง หรือแม้แต่ข้ามประเทศผ่านการเดินทางทางอากาศได้อย่างรวดเร็ว'
        ),
        bullet('CDC ติดตามสถานการณ์โรคใน Kibera อย่างใกล้ชิด'),
        bullet('เจ้าหน้าที่สาธารณสุขในพื้นที่ลงเยี่ยมครอบครัวทุกสองสัปดาห์และเก็บข้อมูลสุขภาพด้วยอุปกรณ์พกพา'),
        bullet('ผู้ป่วยจะถูกส่งต่อไปยังคลินิกที่พัฒนาขึ้นด้วยการสนับสนุนจากผู้บริจาคในสหรัฐฯ และคำแนะนำจาก CDC'),
        bullet('คลินิกใช้ระบบบันทึกข้อมูลอิเล็กทรอนิกส์เพื่อติดตามผู้ป่วยและแนวโน้มของโรค'),
        bullet('ห้องปฏิบัติการช่วยตรวจหาเชื้อได้รวดเร็วขึ้น ทำให้การตอบสนองต่อโรคมีประสิทธิภาพมากขึ้น'),

        heading('3.3 การป้องกันและดูแลผู้ป่วย HIV ในเคนยา', HeadingLevel.HEADING_2),
        body(
          'อีกตัวอย่างสำคัญในวิดีโอคือการทำงานร่วมกันระหว่าง CDC กับ Coptic Hospital ในเคนยา โดยมุ่งเน้นการป้องกันและรักษา HIV ซึ่งเป็นโรคติดต่อสำคัญที่ส่งผลกระทบต่อเด็กและครอบครัวอย่างมาก วิดีโอนี้แสดงให้เห็นว่าการป้องกันโรคไม่ได้หมายถึงการหลีกเลี่ยงโรคอย่างเดียว แต่รวมถึงการเข้าถึงการรักษาและการลดโอกาสการส่งต่อเชื้อด้วย'
        ),
        bullet('CDC และโรงพยาบาลให้การดูแลเด็กที่ติดเชื้อ HIV และครอบครัว'),
        bullet('มีการช่วยเหลือแม่เพื่อลดโอกาสการส่งต่อเชื้อ HIV จากแม่สู่ลูก'),
        bullet('ตาม transcript ในปี 2011 มีการให้คำปรึกษาแก่เด็กที่ติดเชื้อ HIV มากกว่า 4,000 ครั้ง'),
        bullet('แม่มากกว่า 200 คนได้รับยาที่ช่วยลดโอกาสการแพร่เชื้อไปยังทารก'),

        heading('3.4 การควบคุมโรคโปลิโอในอินเดีย', HeadingLevel.HEADING_2),
        body(
          'วิดีโอยังเน้นการทำงานของ CDC ในอินเดียเกี่ยวกับโรคโปลิโอ ซึ่งเคยเป็นหนึ่งในแหล่งแพร่เชื้อสำคัญของโลก โรคโปลิโอถูกยกมาเป็นตัวอย่างชัดเจนของโรคติดต่อที่สามารถป้องกันได้ด้วยวัคซีนและความร่วมมือระดับนานาชาติ'
        ),
        bullet('โปลิโอเป็นโรคติดต่อที่แพร่กระจายได้ง่าย'),
        bullet('โรคนี้สามารถทำลายระบบประสาทและก่อให้เกิดอัมพาตได้ภายในเวลาไม่นาน'),
        bullet('พื้นที่เสี่ยงมักเกี่ยวข้องกับความแออัด ระบบระบายน้ำเสียแบบเปิด และอัตราการเกิดสูง'),
        bullet('CDC สนับสนุนการเข้าถึงเด็กที่ย้ายถิ่น ซึ่งมักเป็นกลุ่มที่พลาดการฉีดวัคซีน'),
        bullet('มีการจัดจุดฉีดวัคซีนตามชายแดน สถานีรถไฟ และจุดคมนาคมสำคัญ'),
        bullet('ตาม transcript จำนวนผู้ป่วยโปลิโอทั่วโลกลดลงประมาณ 99 เปอร์เซ็นต์ตั้งแต่เริ่มโครงการ Global Polio Eradication Initiative ในปี 1988'),
        bullet('ในอินเดีย จำนวนผู้ป่วยที่รายงานลดลง 94 เปอร์เซ็นต์ระหว่างปี 2009 ถึง 2010'),
        bullet('ในปี 2011 transcript ระบุว่าอินเดียมีผู้ป่วยโปลิโอเพียง 1 ราย'),

        heading('3.5 ข้อสรุปของวิดีโอ', HeadingLevel.HEADING_2),
        body(
          'ตอนท้าย วิดีโอชี้ให้เห็นว่า การทำงานด้าน global health ของ CDC ไม่เพียงช่วยชีวิตผู้คนในประเทศอื่น แต่ยังช่วยปกป้องชาวอเมริกันด้วยเช่นกัน การป้องกันโรคตั้งแต่ต้นทางช่วยลดค่าใช้จ่ายจากภาวะฉุกเฉิน ลดการสูญเสียชีวิต และสร้างความร่วมมือที่ดีระหว่างประเทศ'
        ),

        heading('4. โรคสำคัญที่กล่าวถึงในวิดีโอ', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['โรค', 'ประเภท', 'ตัวอย่างแนวทางป้องกันที่ปรากฏในวิดีโอ']),
            tableRow(['HIV/AIDS', 'โรคติดต่อ', 'การรักษา การให้ยาแก่แม่เพื่อลดการส่งต่อเชื้อสู่ลูก การดูแลผ่านคลินิกและโรงพยาบาล']),
            tableRow(['Polio', 'โรคติดต่อ', 'การฉีดวัคซีน การติดตามเด็กกลุ่มเสี่ยง การเข้าถึงผู้ย้ายถิ่น และการฉีดวัคซีนตามจุดคมนาคม']),
            tableRow(['การระบาดของโรคอื่น ๆ', 'โรคติดต่อ', 'การเฝ้าระวังโรค การตรวจทางห้องปฏิบัติการ การเก็บข้อมูล และการตอบสนองอย่างรวดเร็ว']),
          ],
        }),

        heading('5. ประเด็นสาธารณสุขที่วิดีโอเน้น', HeadingLevel.HEADING_1),
        bullet('การเฝ้าระวังโรคเป็นหัวใจของการตรวจพบตั้งแต่ระยะเริ่มต้น'),
        bullet('ข้อมูลสุขภาพอิเล็กทรอนิกส์และการตรวจทางห้องปฏิบัติการช่วยให้ตอบสนองต่อโรคได้เร็วขึ้น'),
        bullet('วัคซีนยังเป็นหนึ่งในมาตรการป้องกันโรคติดต่อที่สำคัญที่สุด'),
        bullet('ความร่วมมือกับชุมชน โรงพยาบาล และหน่วยงานท้องถิ่นมีความจำเป็น'),
        bullet('การเดินทางระหว่างประเทศทำให้โรคที่เกิดในพื้นที่หนึ่งสามารถกลายเป็นปัญหาระดับโลกได้อย่างรวดเร็ว'),
        bullet('การป้องกันโรคช่วยทั้งการรักษาชีวิตและลดต้นทุนด้านสุขภาพในระยะยาว'),

        heading('6. เหตุใดวิดีโอนี้จึงสำคัญต่อหัวข้อ Disease Prevention', HeadingLevel.HEADING_1),
        body(
          'วิดีโอนี้แสดงให้เห็นการป้องกันโรคในหลายระดับพร้อมกัน ในระดับบุคคล ผู้คนได้รับวัคซีน การตรวจ และการรักษา ในระดับชุมชน คลินิกและห้องปฏิบัติการทำหน้าที่ติดตามโรคและตอบสนองอย่างรวดเร็ว ส่วนในระดับนานาชาติ องค์กรด้านสาธารณสุขร่วมกันสร้างระบบป้องกันเพื่อหยุดการระบาดก่อนที่จะขยายไปกว้างขึ้น'
        ),
        body(
          'นอกจากนี้ วิดีโอยังทำให้เห็นว่ากลยุทธ์การป้องกันโรคต้องต่างกันไปตามชนิดของโรค เช่น HIV ต้องเน้นการรักษา การดูแลแม่และเด็ก และการลดการส่งต่อเชื้อ ส่วนโปลิโอต้องเน้นการฉีดวัคซีนอย่างครอบคลุมและเข้าถึงประชากรที่มักถูกมองข้าม'
        ),

        heading('7. ข้อเท็จจริงสำคัญที่ควรจำ', HeadingLevel.HEADING_1),
        bullet('CDC มีผู้เชี่ยวชาญทำงานในมากกว่า 50 ประเทศ'),
        bullet('ในปี 2011 CDC ตอบสนองต่อเหตุระบาดและเหตุฉุกเฉินเกือบ 250 ครั้งใน 20 ประเทศ'),
        bullet('ใน Kibera เจ้าหน้าที่สาธารณสุขลงพื้นที่เก็บข้อมูลทุกสองสัปดาห์ด้วยอุปกรณ์พกพา'),
        bullet('ในปี 2011 มีการให้คำปรึกษาแก่เด็กที่ติดเชื้อ HIV มากกว่า 4,000 ครั้งในโครงการที่กล่าวถึง'),
        bullet('แม่มากกว่า 200 คนได้รับยาเพื่อลดการส่งต่อเชื้อ HIV ไปยังทารก'),
        bullet('จำนวนผู้ป่วยโปลิโอทั่วโลกลดลงประมาณ 99 เปอร์เซ็นต์นับตั้งแต่ปี 1988'),
        bullet('ในอินเดีย จำนวนผู้ป่วยโปลิโอลดลง 94 เปอร์เซ็นต์ระหว่างปี 2009 ถึง 2010 และในปี 2011 มีเพียง 1 รายตาม transcript'),

        heading('8. ข้อคิดจากวิดีโอ', HeadingLevel.HEADING_1),
        body(
          'บทเรียนสำคัญจากวิดีโอนี้คือ การป้องกันโรคที่มีประสิทธิภาพต้องเริ่มก่อนที่โรคจะมาถึงบ้านเรา CDC นำเสนอให้เห็นว่า global health ไม่ได้แยกออกจากสุขภาพภายในประเทศ แต่เป็นส่วนหนึ่งของการปกป้องประชาชนโดยตรง เมื่อโลกเชื่อมโยงกันมากขึ้น โรคติดต่อในประเทศหนึ่งก็สามารถกลายเป็นความเสี่ยงของอีกประเทศได้อย่างรวดเร็ว'
        ),
        body(
          'วิดีโอยังสะท้อนว่าพื้นที่ที่มีความแออัด สุขาภิบาลไม่ดี หรือเข้าถึงบริการสุขภาพยาก จะมีความเสี่ยงต่อการแพร่โรคมากกว่า ดังนั้นการลงทุนในระบบเฝ้าระวังโรค คลินิก การรักษา และวัคซีน จึงเป็นการป้องกันโรคที่คุ้มค่าและยั่งยืน'
        ),

        heading('9. ประเด็นที่นำไปใช้ตอบ Discussion ได้', HeadingLevel.HEADING_1),
        bullet('วิดีโอนี้เน้นโรคติดต่อเป็นหลัก โดยเฉพาะ HIV และ polio'),
        bullet('กลยุทธ์การป้องกันที่เห็นชัดคือ surveillance, vaccination, treatment, และ community health work'),
        bullet('บทบาทของบุคคล ได้แก่ การเข้ารับวัคซีน การตรวจ การรักษา และการปฏิบัติตามคำแนะนำด้านสุขภาพ'),
        bullet('บทบาทของชุมชน ได้แก่ การสนับสนุนคลินิก ระบบเฝ้าระวังโรค การให้ความรู้ และการเข้าถึงประชากรกลุ่มเสี่ยง'),
        bullet('วิดีโอนี้เหมาะมากสำหรับใช้ตอบหัวข้อ communicable disease แต่ไม่ได้อธิบาย noncommunicable disease โดยตรง'),

        heading('10. แหล่งอ้างอิง', HeadingLevel.HEADING_1),
        body('YouTube: https://www.youtube.com/watch?v=IsITU2RLEo4'),
        body('CDC archived transcript: https://archive.cdc.gov/www_cdc_gov/globalhealth/video/globalhealth/globalhealth.htm'),
      ],
    },
  ],
})

async function main() {
  const workspaceRoot = path.resolve(process.cwd(), '..')
  const outPath = path.join(workspaceRoot, 'CDC-Global-Health-Video-Summary-TH.docx')
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(outPath, buffer)
  console.log(`Generated: ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
