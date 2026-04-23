import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageBreak,
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

type DocConfig = {
  fileName: string
  title: string
  subtitle: string
  editionLabel: string
  preparedLabel: string
  defaultFont: string
  headingColor: string
  bodySize: number
  heading1Size: number
  heading2Size: number
}

type TableData = {
  headers: string[]
  rows: string[][]
}

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbered'; items: string[] }
  | { kind: 'table'; table: TableData }
  | { kind: 'pageBreak' }

type Section = {
  title: string
  blocks: Block[]
  subsections?: {
    title: string
    blocks: Block[]
  }[]
}

type GuideDoc = {
  config: DocConfig
  intro: string[]
  sections: Section[]
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function paragraph(text: string, config: DocConfig, options?: { bold?: boolean; italics?: boolean; color?: string; size?: number; alignment?: AlignmentType }) {
  return new Paragraph({
    alignment: options?.alignment,
    spacing: { after: 140 },
    children: [
      new TextRun({
        text,
        font: config.defaultFont,
        size: options?.size ?? config.bodySize,
        bold: options?.bold,
        italics: options?.italics,
        color: options?.color,
      }),
    ],
  })
}

function heading(text: string, level: 1 | 2, config: DocConfig) {
  const size = level === 1 ? config.heading1Size : config.heading2Size
  return new Paragraph({
    spacing: { before: 260, after: 120 },
    children: [
      new TextRun({
        text,
        font: config.defaultFont,
        size,
        bold: true,
        color: config.headingColor,
      }),
    ],
  })
}

function bullet(text: string, config: DocConfig, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 70 },
    children: [
      new TextRun({
        text,
        font: config.defaultFont,
        size: config.bodySize,
      }),
    ],
  })
}

function numbered(text: string, index: number, config: DocConfig) {
  return new Paragraph({
    spacing: { after: 70 },
    children: [
      new TextRun({
        text: `${index}. ${text}`,
        font: config.defaultFont,
        size: config.bodySize,
      }),
    ],
  })
}

function table(data: TableData, config: DocConfig) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: data.headers.map((header) =>
          new TableCell({
            borders: { top: border, bottom: border, left: border, right: border },
            shading: { fill: '1F4E79' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: header,
                    font: config.defaultFont,
                    size: config.bodySize,
                    bold: true,
                    color: 'FFFFFF',
                  }),
                ],
              }),
            ],
          }),
        ),
      }),
      ...data.rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell) =>
              new TableCell({
                borders: { top: border, bottom: border, left: border, right: border },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell,
                        font: config.defaultFont,
                        size: config.bodySize,
                      }),
                    ],
                  }),
                ],
              }),
            ),
          }),
      ),
    ],
  })
}

function renderBlocks(blocks: Block[], config: DocConfig) {
  const children: (Paragraph | Table)[] = []

  for (const block of blocks) {
    if (block.kind === 'paragraph') {
      children.push(paragraph(block.text, config))
      continue
    }

    if (block.kind === 'bullets') {
      children.push(...block.items.map((item) => bullet(item, config)))
      continue
    }

    if (block.kind === 'numbered') {
      children.push(...block.items.map((item, index) => numbered(item, index + 1, config)))
      continue
    }

    if (block.kind === 'table') {
      children.push(table(block.table, config))
      children.push(new Paragraph({ spacing: { after: 120 } }))
      continue
    }

    if (block.kind === 'pageBreak') {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
  }

  return children
}

function buildDoc(docData: GuideDoc) {
  const { config, intro, sections } = docData
  const generatedAt = new Date().toLocaleDateString(config.fileName.includes('-TH') ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: '', break: 5 })] }),
    paragraph(config.title, config, {
      bold: true,
      size: 42,
      color: config.headingColor,
      alignment: AlignmentType.CENTER,
    }),
    paragraph(config.subtitle, config, {
      bold: true,
      size: 30,
      alignment: AlignmentType.CENTER,
    }),
    paragraph(config.editionLabel, config, {
      italics: true,
      color: '666666',
      alignment: AlignmentType.CENTER,
    }),
    paragraph(`${config.preparedLabel} ${generatedAt}`, config, {
      italics: true,
      color: '666666',
      alignment: AlignmentType.CENTER,
    }),
  ]

  for (const text of intro) {
    children.push(paragraph(text, config))
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  for (const section of sections) {
    children.push(heading(section.title, 1, config))
    children.push(...renderBlocks(section.blocks, config))

    for (const subsection of section.subsections ?? []) {
      children.push(heading(subsection.title, 2, config))
      children.push(...renderBlocks(subsection.blocks, config))
    }
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: config.defaultFont,
            size: config.bodySize,
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
        children,
      },
    ],
  })
}

function renderHtmlBlocks(blocks: Block[]) {
  return blocks
    .map((block) => {
      if (block.kind === 'paragraph') return `<p>${escapeHtml(block.text)}</p>`
      if (block.kind === 'bullets') return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      if (block.kind === 'numbered') return `<ol>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
      if (block.kind === 'table') {
        return `
          <table>
            <thead>
              <tr>${block.table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${block.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        `
      }
      if (block.kind === 'pageBreak') return '<div class="page-break"></div>'
      return ''
    })
    .join('\n')
}

function buildHtml(docData: GuideDoc) {
  const { config, intro, sections } = docData
  const generatedAt = new Date().toLocaleDateString(config.fileName.includes('-TH') ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const sectionHtml = sections
    .map((section) => {
      const subsectionHtml = (section.subsections ?? [])
        .map(
          (subsection) => `
            <section class="subsection">
              <h2>${escapeHtml(subsection.title)}</h2>
              ${renderHtmlBlocks(subsection.blocks)}
            </section>
          `,
        )
        .join('\n')

      return `
        <section class="section">
          <h1>${escapeHtml(section.title)}</h1>
          ${renderHtmlBlocks(section.blocks)}
          ${subsectionHtml}
        </section>
      `
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="${config.fileName.includes('-TH') ? 'th' : 'en'}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(config.title)} - ${escapeHtml(config.subtitle)}</title>
    <style>
      @page {
        size: A4;
        margin: 18mm;
      }

      :root {
        --heading: #${config.headingColor};
        --border: #d0d7de;
        --muted: #666666;
      }

      body {
        margin: 0;
        font-family: "${config.defaultFont}", Aptos, "Segoe UI", sans-serif;
        color: #1f2937;
        font-size: ${Math.max(12, Math.round(config.bodySize / 2))}pt;
        line-height: 1.45;
        background: #ffffff;
      }

      .cover {
        text-align: center;
        padding-top: 80px;
        padding-bottom: 24px;
      }

      .cover h1 {
        margin: 0 0 8px;
        color: var(--heading);
        font-size: 24pt;
      }

      .cover h2 {
        margin: 0 0 8px;
        font-size: 18pt;
      }

      .cover p.meta {
        margin: 4px 0;
        color: var(--muted);
      }

      h1, h2 {
        color: var(--heading);
        margin-top: 20px;
        margin-bottom: 8px;
      }

      h1 { font-size: 18pt; }
      h2 { font-size: 15pt; }

      p {
        margin: 0 0 10px;
      }

      ul, ol {
        margin: 0 0 12px 22px;
        padding: 0;
      }

      li {
        margin: 0 0 4px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0 14px;
        table-layout: fixed;
      }

      th, td {
        border: 1px solid var(--border);
        padding: 8px 10px;
        vertical-align: top;
        word-break: break-word;
      }

      th {
        background: #1f4e79;
        color: #ffffff;
        text-align: left;
      }

      .page-break {
        page-break-after: always;
      }
    </style>
  </head>
  <body>
    <main class="document">
      <section class="cover">
        <h1>${escapeHtml(config.title)}</h1>
        <h2>${escapeHtml(config.subtitle)}</h2>
        <p class="meta">${escapeHtml(config.editionLabel)}</p>
        <p class="meta">${escapeHtml(config.preparedLabel)} ${escapeHtml(generatedAt)}</p>
      </section>
      ${intro.map((text) => `<p>${escapeHtml(text)}</p>`).join('\n')}
      <div class="page-break"></div>
      ${sectionHtml}
    </main>
  </body>
</html>`
}

const englishGuide: GuideDoc = {
  config: {
    fileName: 'IT-Asset-Tracker-Phase-Execution-Guide-EN.docx',
    title: 'IT Asset Tracker',
    subtitle: 'Phase Execution Guide',
    editionLabel: 'English Edition',
    preparedLabel: 'Prepared on',
    defaultFont: 'Aptos',
    headingColor: '1F4E79',
    bodySize: 22,
    heading1Size: 30,
    heading2Size: 26,
  },
  intro: [
    'This guide is designed to control delivery from kickoff to production release. It helps the team work in defined phases, reduce avoidable mistakes, resume work cleanly after interruptions, and keep both the Lead Tech and Project Manager aligned from the beginning through completion.',
    'The guide is built around the required workflow: /spec, /plan, /build, /test, /review, and /ship.',
    'For this project, the target authentication model is Supabase Hybrid Auth: email/password plus magic link for existing users, with the staff QA password kept as staff123.',
  ],
  sections: [
    {
      title: '1. Core Control Principles',
      blocks: [
        { kind: 'paragraph', text: 'Every phase must answer five questions before the team moves on.' },
        {
          kind: 'numbered',
          items: [
            'What phase are we in right now?',
            'What is the objective of this phase?',
            'What deliverables must exist before we exit this phase?',
            'What evidence proves the phase is complete?',
            'If work stops right now, what must the next person know to continue immediately?',
          ],
        },
      ],
    },
    {
      title: '2. Project Artifacts That Must Stay Current',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Spec / PRD: problem, scope, constraints, acceptance criteria',
            'Implementation Plan: ordered tasks with dependencies',
            'Decision Log: architecture and scope decisions',
            'Risk / Blocker Log: current risks, owners, and follow-up dates',
            'Progress Log: what is done, in progress, and waiting',
            'Verification Log: lint, build, tests, QA, deployment checks',
            'Handoff Note: the minimum context required when work pauses',
          ],
        },
      ],
    },
    {
      title: '3. Phase Overview',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Phase', 'Primary Goal', 'Required Deliverable', 'Gate Before Exit'],
            rows: [
              ['/spec', 'Define the work clearly', 'Technical spec or PRD', 'No implementation code yet'],
              ['/plan', 'Create a dependency-safe roadmap', 'Task plan with definitions of done', 'Every task has an owner and a verification method'],
              ['/build', 'Implement one small slice at a time', 'Code and config changes for the slice', 'The slice stays reversible'],
              ['/test', 'Prove it works', 'Evidence from commands and checks', 'No unsupported completion claims'],
              ['/review', 'Audit quality and risk', 'Findings, fixes, residual risks', 'No critical issue is silently left behind'],
              ['/ship', 'Release safely', 'Deployment checklist and rollback plan', 'Post-release verification is ready'],
            ],
          },
        },
      ],
    },
    {
      title: '4. Pre-Phase Setup',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Identify the work owner.',
            'State whether the work is a feature, migration, or bug fix.',
            'List key stakeholders.',
            'Record the milestone or deadline when available.',
            'Separate known facts from assumptions that still need validation.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Before Phase 1 starts, everyone should know what the work is and what is explicitly out of scope.',
        },
      ],
    },
    {
      title: '5. Phase Details',
      blocks: [],
      subsections: [
        {
          title: '5.1 /spec',
          blocks: [
            { kind: 'paragraph', text: 'Goal: eliminate ambiguity before code changes begin.' },
            {
              kind: 'bullets',
              items: [
                'Analyze the request and inspect the current repo.',
                'Define current state, target state, scope, and non-scope.',
                'State stack choices, constraints, acceptance criteria, and key risks.',
                'Document open questions that still need answers.',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'What They Must See'],
                rows: [
                  ['Lead Tech', 'Architecture direction, business rules, migration risk, security implications'],
                  ['Project Manager', 'Scope clarity, MVP boundary, timeline risk, external dependencies'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'Do not write implementation code in this phase.',
                'Do not guess requirements without inspecting real context.',
              ],
            },
          ],
        },
        {
          title: '5.2 /plan',
          blocks: [
            { kind: 'paragraph', text: 'Goal: convert the spec into a trackable, dependency-aware roadmap.' },
            {
              kind: 'bullets',
              items: [
                'Break the work into atomic tasks.',
                'Order tasks by dependency.',
                'Separate risky tasks from low-risk tasks.',
                'Define files, modules, schemas, and environments affected.',
                'Attach a definition of done and verification method to every task.',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'What They Must See'],
                rows: [
                  ['Lead Tech', 'Safe task order, clear technical sequencing, isolation of risky migrations'],
                  ['Project Manager', 'Milestones, progress checkpoints, dependency visibility'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'Do not combine multiple large themes into one task.',
                'Do not start building while planning is still ambiguous.',
              ],
            },
          ],
        },
        {
          title: '5.3 /build',
          blocks: [
            { kind: 'paragraph', text: 'Goal: deliver in small slices that can be verified and reversed.' },
            {
              kind: 'bullets',
              items: [
                'Implement one slice at a time.',
                'Keep the slice scope small and explicit.',
                'Update progress after each slice.',
                'Pause and re-plan if a new architectural risk appears.',
                'Prefer foundation first: schema, auth, guards, env, then feature flows.',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'What They Must See'],
                rows: [
                  ['Lead Tech', 'Implementation quality, alignment with plan, no unnecessary complexity'],
                  ['Project Manager', 'Completed slices, active slice, new blockers or slippage'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'Do not build multiple hard-to-verify slices in parallel.',
                'Do not change architecture silently mid-stream.',
              ],
            },
          ],
        },
        {
          title: '5.4 /test',
          blocks: [
            { kind: 'paragraph', text: 'Goal: replace assumptions with proof.' },
            {
              kind: 'bullets',
              items: [
                'Run lint, build, and automated tests where available.',
                'Run manual checks on critical user and admin flows.',
                'Verify role-based access, regression risk, and deployment-sensitive paths.',
                'Record exact commands, pass/fail states, and testing gaps.',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'What They Must See'],
                rows: [
                  ['Lead Tech', 'Coverage of risky paths such as auth, data, security, and critical workflows'],
                  ['Project Manager', 'Readiness for review, open defects, remaining QA dependencies'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'Do not say the work is done without evidence.',
                'Do not hide failures or skip critical-path manual verification.',
              ],
            },
          ],
        },
        {
          title: '5.5 /review',
          blocks: [
            { kind: 'paragraph', text: 'Goal: audit the implementation for readability, security, maintainability, and production safety.' },
            {
              kind: 'bullets',
              items: [
                'Review readability and code simplicity.',
                'Review authorization, data protection, and security gaps.',
                'Review maintainability, duplication, and unnecessary abstraction.',
                'Review documentation, onboarding, and operational readiness.',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'What They Must See'],
                rows: [
                  ['Lead Tech', 'Critical issues, code smells, maintainability concerns, readiness for release'],
                  ['Project Manager', 'Residual risks, approvals needed, remaining release blockers'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'Do not reduce review to formatting only.',
                'Do not leave known security gaps undocumented.',
              ],
            },
          ],
        },
        {
          title: '5.6 /ship',
          blocks: [
            { kind: 'paragraph', text: 'Goal: release safely with a known rollback path.' },
            {
              kind: 'bullets',
              items: [
                'Check env vars, secrets, schema readiness, and deployment config.',
                'Prepare release notes and rollback instructions.',
                'Run pre-release and post-release verification.',
                'Identify monitoring or logs that must be watched after release.',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'What They Must See'],
                rows: [
                  ['Lead Tech', 'Deployment risk, rollback path, post-release monitoring plan'],
                  ['Project Manager', 'Release window, stakeholder communication, post-release status'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'Do not release without a rollback plan.',
                'Do not assume a successful deploy equals a successful release.',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '6. Stop-and-Resume Rules',
      blocks: [
        { kind: 'paragraph', text: 'Whenever work stops mid-stream, leave a handoff note with at least these eight items.' },
        {
          kind: 'numbered',
          items: [
            'Current Phase',
            'Objective of the current phase',
            'Work already completed',
            'Work still not completed',
            'Latest blocker or risk',
            'Latest important decision',
            'Evidence already collected',
            'Immediate next step',
          ],
        },
      ],
      subsections: [
        {
          title: '6.1 Recommended Handoff Note',
          blocks: [
            {
              kind: 'paragraph',
              text: 'Current Phase: /build. Current Slice: Hybrid auth guard update. Done: server auth helper, route guard, session role mapping, password login path. Not Done: magic-link callback verification and staff restriction check on /audit. Blocker: final decision needed on staff asset visibility scope. Latest Decision: keep Supabase Hybrid Auth as target and avoid a Prisma auth bridge. Evidence: lint passed, manual login test pending. Next Step: finish magic-link authorization checks, then run /test.',
            },
          ],
        },
      ],
    },
    {
      title: '7. Status Reporting for Lead Tech and PM',
      blocks: [
        { kind: 'paragraph', text: 'Use the same compact status format throughout the project to keep leadership aligned.' },
        {
          kind: 'bullets',
          items: [
            'Current Phase',
            'Completed This Period',
            'In Progress',
            'Next Phase Gate',
            'Risks / Blockers',
            'Decisions Needed',
            'ETA to Next Milestone',
          ],
        },
      ],
    },
    {
      title: '8. Project-Level Quality Checklist',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Every phase has a clear owner.',
            'Every phase has exit criteria.',
            'Every phase has evidence.',
            'Every pause in work has a handoff note.',
            'Every important decision is logged.',
            'Every blocker has an owner and a target follow-up date.',
            'Every release has a rollback plan.',
          ],
        },
      ],
    },
    {
      title: '9. Short Summary',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Spec before build.',
            'Build in small slices.',
            'Every slice must be verified.',
            'Review before ship.',
            'Every interruption must leave a handoff note.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Following these rules keeps the project moving even when ownership changes, work pauses mid-stream, or multiple stakeholders need the same view of progress from kickoff through release.',
        },
      ],
    },
  ],
}

const thaiGuide: GuideDoc = {
  config: {
    fileName: 'IT-Asset-Tracker-Phase-Execution-Guide-TH.docx',
    title: 'IT Asset Tracker',
    subtitle: 'คู่มือการทำงานแบบแบ่ง Phase',
    editionLabel: 'ฉบับภาษาไทย',
    preparedLabel: 'จัดทำเมื่อ',
    defaultFont: 'TH Sarabun New',
    headingColor: '1F4E79',
    bodySize: 28,
    heading1Size: 34,
    heading2Size: 30,
  },
  intro: [
    'คู่มือฉบับนี้ใช้เพื่อควบคุมการทำงานของโปรเจกต์ตั้งแต่เริ่มต้นจนจบ โดยเน้นการลดความผิดพลาดจากการข้ามขั้นตอน ช่วยให้กลับมาทำงานต่อได้ง่ายเมื่อหยุดกลางคัน และทำให้ Lead Tech กับ Project Manager เห็นภาพเดียวกันตลอดทั้งโครงการ',
    'โครงสร้างทั้งหมดอ้างอิง workflow หลักที่ต้องทำตามอย่างมีวินัย ได้แก่ /spec, /plan, /build, /test, /review และ /ship',
    'สำหรับโปรเจกต์นี้ เป้าหมายด้านการยืนยันตัวตนคือ Supabase Hybrid Auth: รองรับทั้ง Email + Password และ Magic Link สำหรับผู้ใช้ที่มีบัญชีอยู่แล้ว โดย credential ของ staff สำหรับ QA ให้ใช้ staff123',
  ],
  sections: [
    {
      title: '1. หลักการควบคุมงาน',
      blocks: [
        { kind: 'paragraph', text: 'ทุก phase ต้องตอบคำถาม 5 ข้อนี้ให้ได้ก่อนจะขยับไปขั้นถัดไป' },
        {
          kind: 'numbered',
          items: [
            'ตอนนี้เรากำลังอยู่ phase อะไร',
            'เป้าหมายของ phase นี้คืออะไร',
            'สิ่งที่ต้องส่งมอบก่อนออกจาก phase นี้มีอะไรบ้าง',
            'หลักฐานอะไรใช้ยืนยันว่า phase นี้ผ่านแล้ว',
            'ถ้าหยุดงานตอนนี้ คนถัดไปต้องรู้อะไรเพื่อทำต่อได้ทันที',
          ],
        },
      ],
    },
    {
      title: '2. เอกสารกลางที่ต้องอัปเดตเสมอ',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Spec / PRD: ปัญหา ขอบเขต ข้อจำกัด และ acceptance criteria',
            'Implementation Plan: task ที่เรียงตาม dependency',
            'Decision Log: การตัดสินใจสำคัญด้านสถาปัตยกรรมและขอบเขต',
            'Risk / Blocker Log: ความเสี่ยง สิ่งที่ติดขัด เจ้าของงาน และวันติดตาม',
            'Progress Log: งานที่เสร็จ กำลังทำ และรออยู่',
            'Verification Log: lint, build, test, QA, deployment check',
            'Handoff Note: บริบทขั้นต่ำที่ต้องทิ้งไว้เมื่อหยุดงาน',
          ],
        },
      ],
    },
    {
      title: '3. ภาพรวมแต่ละ Phase',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Phase', 'เป้าหมายหลัก', 'สิ่งที่ต้องส่งมอบ', 'Gate ก่อนออกจาก Phase'],
            rows: [
              ['/spec', 'นิยามงานให้ชัด', 'Technical spec หรือ PRD', 'ยังไม่เริ่ม implementation'],
              ['/plan', 'ทำ roadmap ที่เรียงตาม dependency', 'Task plan พร้อม definition of done', 'ทุก task มี owner และ verification method'],
              ['/build', 'พัฒนาเป็น slice เล็ก ๆ', 'Code และ config change ของ slice นั้น', 'slice ยังต้องย้อนกลับได้'],
              ['/test', 'พิสูจน์ว่างานใช้ได้จริง', 'หลักฐานจากคำสั่งและการตรวจสอบ', 'ห้ามสรุปผลโดยไม่มี evidence'],
              ['/review', 'ตรวจคุณภาพและความเสี่ยง', 'Findings, fixes, residual risks', 'ห้ามมี critical issue ค้างแบบเงียบ ๆ'],
              ['/ship', 'ปล่อยขึ้น production อย่างปลอดภัย', 'Deployment checklist และ rollback plan', 'พร้อม post-release verification'],
            ],
          },
        },
      ],
    },
    {
      title: '4. สิ่งที่ต้องทำก่อนเข้า Phase แรก',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'ระบุ owner ของงาน',
            'ระบุว่างานรอบนี้เป็น feature, migration หรือ bug fix',
            'ระบุ stakeholder หลัก',
            'ระบุ milestone หรือ deadline ถ้ามี',
            'แยกสิ่งที่เป็น fact ออกจาก assumption ที่ยังต้องพิสูจน์',
          ],
        },
        {
          kind: 'paragraph',
          text: 'ก่อนเริ่ม Phase 1 ทุกคนควรรู้ตรงกันว่างานนี้คืออะไร และอะไรไม่อยู่ในรอบงานนี้',
        },
      ],
    },
    {
      title: '5. รายละเอียดแต่ละ Phase',
      blocks: [],
      subsections: [
        {
          title: '5.1 /spec',
          blocks: [
            { kind: 'paragraph', text: 'เป้าหมาย: ตัดความคลุมเครือออกให้มากที่สุดก่อนเริ่มแก้โค้ด' },
            {
              kind: 'bullets',
              items: [
                'วิเคราะห์คำขอและตรวจ repo ปัจจุบันก่อนเสมอ',
                'ระบุ current state, target state, scope และ non-scope',
                'ระบุ stack, constraints, acceptance criteria และความเสี่ยงหลัก',
                'บันทึกคำถามที่ยังไม่ปิด',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'สิ่งที่ต้องเห็น'],
                rows: [
                  ['Lead Tech', 'ทิศทาง architecture, business rule, migration risk, security impact'],
                  ['Project Manager', 'ความชัดเจนของ scope, ขอบเขต MVP, ความเสี่ยงต่อ timeline, dependency ภายนอก'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'ห้ามเขียน implementation code ใน phase นี้',
                'ห้ามเดา requirement โดยไม่ตรวจ context จริง',
              ],
            },
          ],
        },
        {
          title: '5.2 /plan',
          blocks: [
            { kind: 'paragraph', text: 'เป้าหมาย: แปลง spec ให้เป็น roadmap ที่ track ได้จริง' },
            {
              kind: 'bullets',
              items: [
                'แตกงานเป็น task เล็ก ๆ',
                'เรียง task ตาม dependency',
                'แยก task เสี่ยงออกจาก task ปกติ',
                'ระบุ file, module, schema และ environment ที่ได้รับผลกระทบ',
                'ใส่ definition of done และ verification method ให้ทุก task',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'สิ่งที่ต้องเห็น'],
                rows: [
                  ['Lead Tech', 'ลำดับ technical task ที่ปลอดภัย และการแยกงานเสี่ยงออกจากกัน'],
                  ['Project Manager', 'milestone, checkpoint, และภาพ dependency ของงาน'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'ห้ามรวมหลายธีมใหญ่ไว้ใน task เดียว',
                'ห้ามเริ่ม build ถ้า plan ยังไม่ชัด',
              ],
            },
          ],
        },
        {
          title: '5.3 /build',
          blocks: [
            { kind: 'paragraph', text: 'เป้าหมาย: พัฒนาแบบ incremental โดยให้ verify และย้อนกลับได้' },
            {
              kind: 'bullets',
              items: [
                'ลงมือทำทีละ slice',
                'คุม scope ของ slice ให้เล็กและชัด',
                'อัปเดต progress หลังจบแต่ละ slice',
                'ถ้าเจอ risk ใหม่ที่กระทบ architecture ให้หยุดและปรับ plan',
                'ทำ foundation ก่อน เช่น schema, auth, guards, env แล้วค่อย flow หลัก',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'สิ่งที่ต้องเห็น'],
                rows: [
                  ['Lead Tech', 'คุณภาพ implementation, ความสอดคล้องกับ plan, และการไม่ over-engineer'],
                  ['Project Manager', 'slice ที่เสร็จแล้ว, slice ปัจจุบัน, blocker ใหม่ หรือความล่าช้า'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'ห้าม build หลาย slice ที่ verify ยากพร้อมกัน',
                'ห้ามเปลี่ยน architecture กลางทางแบบไม่บันทึก',
              ],
            },
          ],
        },
        {
          title: '5.4 /test',
          blocks: [
            { kind: 'paragraph', text: 'เป้าหมาย: เปลี่ยน assumption ให้เป็น proof' },
            {
              kind: 'bullets',
              items: [
                'รัน lint, build และ automated tests ที่มี',
                'ทำ manual checks บน critical path',
                'ตรวจ role-based access, regression risk และ flow สำคัญ',
                'บันทึกคำสั่งที่รัน สถานะ pass/fail และช่องว่างของการทดสอบ',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'สิ่งที่ต้องเห็น'],
                rows: [
                  ['Lead Tech', 'coverage ของ path เสี่ยง เช่น auth, data, security, และ critical workflow'],
                  ['Project Manager', 'ความพร้อมเข้า review, defect ที่ยังเปิดอยู่, และ dependency ฝั่ง QA'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'ห้ามบอกว่างานเสร็จโดยไม่มี evidence',
                'ห้ามซ่อน failure หรือข้าม critical-path verification',
              ],
            },
          ],
        },
        {
          title: '5.5 /review',
          blocks: [
            { kind: 'paragraph', text: 'เป้าหมาย: ตรวจ implementation ให้พร้อมใช้งานจริงในมุม readability, security, maintainability และ production safety' },
            {
              kind: 'bullets',
              items: [
                'review readability และความเรียบง่ายของโค้ด',
                'review authorization, data protection และ security gap',
                'review maintainability, duplication และ abstraction ที่เกินจำเป็น',
                'review documentation, onboarding และ operational readiness',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'สิ่งที่ต้องเห็น'],
                rows: [
                  ['Lead Tech', 'critical issue, code smell, maintainability concern และ readiness ก่อน release'],
                  ['Project Manager', 'residual risk, decision ที่ต้อง approve และ release blocker ที่ยังเหลือ'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'ห้ามลด review ให้เหลือแค่เรื่อง formatting',
                'ห้ามปล่อย security gap ที่รู้แล้วโดยไม่บันทึก',
              ],
            },
          ],
        },
        {
          title: '5.6 /ship',
          blocks: [
            { kind: 'paragraph', text: 'เป้าหมาย: ปล่อยขึ้น production อย่างปลอดภัยและรู้เส้นทาง rollback ชัดเจน' },
            {
              kind: 'bullets',
              items: [
                'ตรวจ env vars, secrets, schema readiness และ deployment config',
                'เตรียม release note และ rollback instruction',
                'ทำ pre-release และ post-release verification',
                'ระบุ monitoring หรือ log ที่ต้องจับตาหลัง release',
              ],
            },
            {
              kind: 'table',
              table: {
                headers: ['Stakeholder', 'สิ่งที่ต้องเห็น'],
                rows: [
                  ['Lead Tech', 'deployment risk, rollback path และแผน monitoring หลังปล่อย'],
                  ['Project Manager', 'release window, stakeholder communication และสถานะหลังปล่อย'],
                ],
              },
            },
            {
              kind: 'bullets',
              items: [
                'ห้ามปล่อยโดยไม่มี rollback plan',
                'ห้ามถือว่า deploy ผ่านเท่ากับ release สำเร็จ',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '6. กฎเมื่อหยุดงานและต้องกลับมาทำต่อ',
      blocks: [
        { kind: 'paragraph', text: 'ทุกครั้งที่หยุดงานกลางคัน ต้องทิ้ง handoff note อย่างน้อย 8 รายการนี้ไว้เสมอ' },
        {
          kind: 'numbered',
          items: [
            'Current Phase',
            'Objective ของ phase ปัจจุบัน',
            'งานที่ทำเสร็จแล้ว',
            'งานที่ยังไม่เสร็จ',
            'Blocker หรือ Risk ล่าสุด',
            'Decision สำคัญล่าสุด',
            'Evidence ที่มีแล้ว',
            'Next Step ที่ควรทำต่อทันที',
          ],
        },
      ],
      subsections: [
        {
          title: '6.1 ตัวอย่าง Handoff Note',
          blocks: [
            {
              kind: 'paragraph',
              text: 'Current Phase: /build. Current Slice: Hybrid auth guard update. Done: server auth helper, route guard, session role mapping และเส้นทาง login แบบ password. Not Done: การ verify callback ของ magic link และ staff restriction check บน /audit. Blocker: ต้องการ final decision เรื่อง scope การมองเห็น asset ของ staff. Latest Decision: ใช้ Supabase Hybrid Auth เป็น target และไม่ใช้ Prisma bridge สำหรับ auth. Evidence: lint ผ่านแล้ว, manual login test ยังไม่รัน. Next Step: ปิด magic-link authorization check และ /audit guard แล้วค่อยเข้า /test.',
            },
          ],
        },
      ],
    },
    {
      title: '7. รูปแบบรายงานสถานะสำหรับ Lead Tech และ PM',
      blocks: [
        { kind: 'paragraph', text: 'ควรใช้ format เดิมตลอดโปรเจกต์เพื่อให้ทุกคนอ่าน progress จากมุมเดียวกัน' },
        {
          kind: 'bullets',
          items: [
            'Current Phase',
            'Completed This Period',
            'In Progress',
            'Next Phase Gate',
            'Risks / Blockers',
            'Decisions Needed',
            'ETA to Next Milestone',
          ],
        },
      ],
    },
    {
      title: '8. Checklist คุมคุณภาพระดับโปรเจกต์',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'ทุก phase มี owner ชัดเจน',
            'ทุก phase มี exit criteria',
            'ทุก phase มี evidence',
            'ทุกครั้งที่หยุดงานมี handoff note',
            'ทุก decision สำคัญถูกบันทึก',
            'ทุก blocker มี owner และวัน follow-up',
            'ทุก release มี rollback plan',
          ],
        },
      ],
    },
    {
      title: '9. สรุปสั้น',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Spec ก่อน Build',
            'Build ทีละ Slice',
            'ทุก Slice ต้อง Verify',
            'Review ก่อน Ship',
            'หยุดเมื่อไรต้องทิ้ง Handoff Note',
          ],
        },
        {
          kind: 'paragraph',
          text: 'เมื่อทำตามกฎนี้ โปรเจกต์จะเดินต่อได้แม้เปลี่ยนคนทำ หยุดงานกลางคัน หรือมีหลาย stakeholder ต้องติดตามงานพร้อมกันตั้งแต่ kickoff จน release',
        },
      ],
    },
  ],
}

async function writeOutputs(docData: GuideDoc) {
  const outDir = path.join(process.cwd(), 'docs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  const doc = buildDoc(docData)
  const buffer = await Packer.toBuffer(doc)
  const docxPath = path.join(outDir, docData.config.fileName)
  const htmlPath = docxPath.replace(/\.docx$/i, '.html')

  fs.writeFileSync(docxPath, buffer)
  fs.writeFileSync(htmlPath, buildHtml(docData), 'utf8')

  console.log(`Generated: ${docxPath}`)
  console.log(`Generated: ${htmlPath}`)
}

async function main() {
  await writeOutputs(englishGuide)
  await writeOutputs(thaiGuide)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
