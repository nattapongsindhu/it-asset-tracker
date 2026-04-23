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
          font: 'Aptos',
          size: 22,
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
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Detailed Summary and Study Notes', italics: true, size: 24, color: '666666' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 260 },
        }),
        body(
          'This document summarizes the CDC video "CDC: Protecting Americans through Global Health" in clear study-ready language. It focuses on the main message, important facts, public health examples, and how the video connects to disease prevention.'
        ),

        heading('1. Video Information', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['Item', 'Details']),
            tableRow(['Title', 'CDC: Protecting Americans through Global Health']),
            tableRow(['Publisher', 'Centers for Disease Control and Prevention (CDC)']),
            tableRow(['YouTube Link', 'https://www.youtube.com/watch?v=IsITU2RLEo4']),
            tableRow(['Primary CDC Transcript Source', 'https://archive.cdc.gov/www_cdc_gov/globalhealth/video/globalhealth/globalhealth.htm']),
            tableRow(['Topic', 'How global health work helps prevent disease spread and protects Americans at home and abroad']),
          ],
        }),

        heading('2. Main Message of the Video', HeadingLevel.HEADING_1),
        body(
          'The video explains that disease prevention is not limited by national borders. The CDC argues that one of the best ways to protect people in the United States is to detect and control outbreaks where they begin. By supporting disease surveillance, vaccination, treatment, and public health infrastructure in other countries, the CDC helps stop dangerous diseases before they spread internationally.'
        ),
        body(
          'In other words, global health is presented as both a humanitarian effort and a practical strategy for national protection. The video shows that helping other countries build stronger disease control systems also reduces health risks for the United States.'
        ),

        heading('3. Detailed Summary', HeadingLevel.HEADING_1),
        heading('3.1 CDC Global Health Mission', HeadingLevel.HEADING_2),
        bullet('CDC works continuously to protect Americans from diseases, including diseases that start overseas.'),
        bullet('The organization has experts working in more than 50 countries.'),
        bullet('Its goal is to detect and control outbreaks at their source.'),
        bullet('According to the video transcript, in 2011 the CDC responded to almost 250 outbreaks and emergencies in 20 countries.'),

        heading('3.2 Example From Nairobi, Kenya', HeadingLevel.HEADING_2),
        body(
          'The video then focuses on Kibera, a densely populated informal settlement in Nairobi, Kenya. The speaker explains that diseases can spread rapidly in places where sanitation, hygiene, and crowding create high-risk conditions. Because people in Kibera move around Nairobi for work and daily life, diseases that begin there can spread to other areas quickly and, through air travel, potentially to other countries within hours.'
        ),
        bullet('CDC carefully monitors diseases in Kibera.'),
        bullet('Local staff visit families every two weeks and collect health information with handheld devices.'),
        bullet('People who are sick are referred to a clinic developed with private U.S. donations and CDC guidance.'),
        bullet('The clinic uses electronic records to monitor patients and track disease spread.'),
        bullet('Its laboratories rapidly test disease-causing organisms that can lead to illness or disability.'),

        heading('3.3 HIV Prevention and Care in Kenya', HeadingLevel.HEADING_2),
        body(
          'The video also highlights CDC work with Coptic Hospital in Kenya, where the focus is HIV prevention and treatment. HIV is presented as a major public health threat, especially for children and families. The partnership shows how disease prevention includes treatment, maternal care, and actions that stop transmission from one generation to the next.'
        ),
        bullet('CDC and Coptic Hospital provide life-saving care to children living with HIV and to their families.'),
        bullet('The program helps prevent transmission of HIV from mothers to babies.'),
        bullet('The transcript states that in 2011 there were more than 4,000 consultations with HIV-infected children.'),
        bullet('It also states that over 200 mothers received medicine to help prevent passing HIV to their babies.'),

        heading('3.4 Polio Control in India', HeadingLevel.HEADING_2),
        body(
          'The second major country example is India. The video explains that India once had one of the largest reservoirs of poliovirus in the world and that the country had historically exported poliovirus to other places. The CDC presents polio eradication in India as a strong example of preventing a communicable disease through coordinated global action.'
        ),
        bullet('Polio is described as highly contagious.'),
        bullet('It can invade the nervous system and cause paralysis in only a few hours.'),
        bullet('High-risk areas are linked to crowded living conditions, open sewage systems, and high birth rates.'),
        bullet('The CDC supports reaching children who migrate, which helps close gaps in vaccination coverage.'),
        bullet('Vaccination campaigns were carried out at borders, railway stations, and highway interchanges.'),
        bullet('The transcript states that since 1988, worldwide polio cases dropped by about 99 percent after the Global Polio Eradication Initiative began.'),
        bullet('It also states that in India, reported cases dropped by 94 percent between 2009 and 2010.'),
        bullet('In 2011, the video says there was only one reported case of polio in India.'),

        heading('3.5 Final Conclusion of the Video', HeadingLevel.HEADING_2),
        body(
          'The video concludes that CDC global health work protects Americans at home while also saving lives abroad. It presents disease control as a shared international responsibility. By reducing outbreaks early, strengthening local public health systems, and building partnerships, the CDC helps reduce future health costs, decrease the need for emergency assistance, and support better international relationships.'
        ),

        heading('4. Key Diseases Mentioned', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['Disease', 'Type', 'How Prevention Is Shown In the Video']),
            tableRow(['HIV/AIDS', 'Communicable disease', 'Care for children, maternal treatment, prevention of mother-to-child transmission, partnership with clinics.']),
            tableRow(['Polio', 'Communicable disease', 'Mass vaccination, focus on migrant children, prevention at high-traffic locations such as borders and stations.']),
            tableRow(['Other outbreak diseases', 'Communicable diseases', 'Surveillance, testing, record tracking, and rapid response in high-risk communities.']),
          ],
        }),

        heading('5. Public Health Themes in the Video', HeadingLevel.HEADING_1),
        bullet('Disease surveillance is essential for early detection.'),
        bullet('Electronic health records and lab testing improve outbreak response.'),
        bullet('Vaccination remains one of the strongest prevention strategies for communicable disease.'),
        bullet('Partnerships with local clinics, hospitals, and communities are necessary.'),
        bullet('Global travel means local outbreaks can quickly become international threats.'),
        bullet('Public health prevention saves both lives and healthcare costs.'),

        heading('6. Why This Video Matters for Disease Prevention', HeadingLevel.HEADING_1),
        body(
          'This video is important because it shows disease prevention at multiple levels. At the individual level, people receive treatment, testing, and vaccines. At the community level, clinics monitor trends, labs test samples, and health workers collect data. At the international level, organizations coordinate to stop diseases before they spread across borders.'
        ),
        body(
          'The video also helps explain why prevention strategies are different depending on the disease. HIV prevention in the video depends on medical care, family support, and reducing transmission. Polio prevention depends heavily on vaccination coverage and reaching populations that might otherwise be missed.'
        ),

        heading('7. Strong Facts to Remember', HeadingLevel.HEADING_1),
        bullet('CDC experts work in over 50 countries.'),
        bullet('In 2011, CDC responded to almost 250 outbreaks and emergencies in 20 countries.'),
        bullet('In Nairobi, local health workers used handheld devices to track disease in Kibera every two weeks.'),
        bullet('In 2011, more than 4,000 consultations were provided to HIV-infected children through the Kenya partnership highlighted in the video.'),
        bullet('Over 200 mothers received medicine to reduce HIV transmission to their babies.'),
        bullet('Worldwide polio cases dropped by approximately 99 percent since the 1988 launch of the Global Polio Eradication Initiative.'),
        bullet('In India, reported polio cases dropped by 94 percent between 2009 and 2010, and only one case was reported in 2011 according to the video transcript.'),

        heading('8. Short Reflection', HeadingLevel.HEADING_1),
        body(
          'A major lesson from this video is that disease prevention requires action before a health threat reaches the United States. The CDC presents global health not as something separate from domestic health, but as an important layer of protection for everyone. The video shows that prevention is most effective when it includes surveillance, vaccination, treatment, and community partnerships.'
        ),
        body(
          'The video also makes it clear that communicable diseases spread faster in places with crowding, poor sanitation, and limited healthcare resources. That is why public health agencies focus on early intervention and infrastructure support. Preventing outbreaks in one region can protect families across the world.'
        ),

        heading('9. Discussion-Ready Notes', HeadingLevel.HEADING_1),
        bullet('The video mainly focuses on communicable disease prevention rather than non-communicable disease.'),
        bullet('If you use this for class discussion, HIV and polio are the clearest communicable disease examples.'),
        bullet('The strongest prevention strategies shown are vaccination, surveillance, maternal treatment, and clinic-based monitoring.'),
        bullet('The video strongly supports the idea that community action and international cooperation both matter in prevention.'),

        heading('10. Sources', HeadingLevel.HEADING_1),
        body('CDC archived transcript page: https://archive.cdc.gov/www_cdc_gov/globalhealth/video/globalhealth/globalhealth.htm'),
        body('YouTube video page: https://www.youtube.com/watch?v=IsITU2RLEo4'),
        body('Additional CDC page noting release details: https://medbox.iiab.me/modules/en-cdc/www.cdc.gov/cdctv/diseaseandconditions/outbreaks/global-health.html'),
      ],
    },
  ],
})

async function main() {
  const workspaceRoot = path.resolve(process.cwd(), '..')
  const outPath = path.join(workspaceRoot, 'CDC-Global-Health-Video-Summary.docx')
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(outPath, buffer)
  console.log(`Generated: ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
