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
  heading3Size: number
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

type Blueprint = {
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

function heading(text: string, level: 1 | 2 | 3, config: DocConfig) {
  const size = level === 1 ? config.heading1Size : level === 2 ? config.heading2Size : config.heading3Size
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

function buildDoc(blueprint: Blueprint) {
  const { config, intro, sections } = blueprint
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
      if (block.kind === 'paragraph') {
        return `<p>${escapeHtml(block.text)}</p>`
      }

      if (block.kind === 'bullets') {
        return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      }

      if (block.kind === 'numbered') {
        return `<ol>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
      }

      if (block.kind === 'table') {
        return `
          <table>
            <thead>
              <tr>${block.table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${block.table.rows
                .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
                .join('')}
            </tbody>
          </table>
        `
      }

      if (block.kind === 'pageBreak') {
        return '<div class="page-break"></div>'
      }

      return ''
    })
    .join('\n')
}

function buildHtml(blueprint: Blueprint) {
  const { config, intro, sections } = blueprint
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

      .document {
        width: 100%;
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

      h1 {
        font-size: 18pt;
      }

      h2 {
        font-size: 15pt;
      }

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

const englishBlueprint: Blueprint = {
  config: {
    fileName: 'IT-Asset-Tracker-Production-Grade-Blueprint-EN.docx',
    title: 'IT Asset Tracker',
    subtitle: 'Production-Grade Blueprint',
    editionLabel: 'English Edition',
    preparedLabel: 'Prepared on',
    defaultFont: 'Aptos',
    headingColor: '1F4E79',
    bodySize: 22,
    heading1Size: 30,
    heading2Size: 26,
    heading3Size: 22,
  },
  intro: [
    'This document defines the production-grade blueprint for evolving the existing GitHub repository nattapongsindhu/it-asset-tracker into a secure, maintainable, and deployment-ready internal asset management application on Vercel and Supabase.',
    'The blueprint is grounded in the current repository state inspected locally and organized around the required engineering workflow: /spec, /plan, /build, /test, /review, and /ship.',
  ],
  sections: [
    {
      title: '1. Current-State Baseline',
      blocks: [
        { kind: 'paragraph', text: 'The current repository is already a working internal tool. It should be treated as a migration and hardening project, not a greenfield rewrite.' },
        {
          kind: 'table',
          table: {
            headers: ['Area', 'Current State'],
            rows: [
              ['Framework', 'Next.js 14 App Router'],
              ['Language', 'TypeScript 5'],
              ['Styling', 'Tailwind CSS 3'],
              ['Data Layer', 'Prisma 5 with SQLite'],
              ['Authentication', 'NextAuth v4 Credentials'],
              ['Validation', 'Zod'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '1.1 Confirmed Routes',
          blocks: [
            {
              kind: 'bullets',
              items: ['/login', '/dashboard', '/assets', '/assets/new', '/assets/[id]', '/assets/[id]/edit', '/audit'],
            },
          ],
        },
        {
          title: '1.2 Confirmed Business Rules',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'Roles are ADMIN and STAFF.',
                'Asset statuses are IN_STOCK, ASSIGNED, IN_REPAIR, and RETIRED.',
                'Staff cannot create, edit, or delete assets.',
                'Audit Log is admin-only.',
                'Mutations are re-checked server-side before database writes.',
                'Notes are rendered as plain text to avoid XSS risk.',
              ],
            },
          ],
        },
        {
          title: '1.3 Current Limitations',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'Assignment history is flattened into the asset record through assignedUserId.',
                'Maintenance work is represented only through status and free-form notes.',
                'There is no storage-backed file system for receipts, warranties, or photos.',
                'SQLite and local credentials auth are not the right production backbone for a Vercel-hosted deployment.',
              ],
            },
          ],
        },
        {
          title: '1.4 Demo Accounts',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['Role', 'Current Seed Credential', 'Required Production-Grade QA Credential'],
                rows: [
                  ['Admin', 'admin@company.com / admin123', 'admin@company.com / admin123'],
                  ['Staff', 'staff@company.com / staff123', 'staff@company.com / staff123'],
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: '2. Production Objective',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Deploy the application on Vercel.',
            'Use Supabase Hybrid Auth for email/password and magic link sign-in.',
            'Allow magic-link access only for existing users; do not open public signup.',
            'Use Supabase Postgres as the primary database.',
            'Use Supabase Storage for asset files.',
            'Keep role-based access control and auditability as first-class requirements.',
            'Preserve working business behavior while making the system production-ready.',
          ],
        },
      ],
    },
    {
      title: '3. Target Architecture',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Layer', 'Production Choice', 'Reason'],
            rows: [
              ['Frontend', 'Next.js App Router', 'Keeps the current rendering model and works naturally on Vercel.'],
              ['Hosting', 'Vercel', 'Simple deployment, preview environments, and strong Next.js fit.'],
              ['Authentication', 'Supabase Auth (Hybrid)', 'Supports both email/password and magic link sign-in while aligning identity with the data platform.'],
              ['Database', 'Supabase Postgres', 'Production-grade relational storage for assets, assignments, and logs.'],
              ['Storage', 'Supabase Storage', 'Supports receipts, warranty files, and asset photos.'],
              ['Security', 'Supabase RLS + server checks', 'Protects data at both database and application layers.'],
            ],
          },
        },
        {
          kind: 'paragraph',
          text: 'Preferred migration principle: move toward a simpler production stack by replacing Prisma + SQLite + NextAuth in the final production path unless a short-lived bridge is explicitly justified in /spec.',
        },
      ],
    },
    {
      title: '4. Proposed Data Blueprint',
      blocks: [
        { kind: 'paragraph', text: 'The production schema should expand the current data model to preserve history, support uploads, and improve audit quality.' },
      ],
      subsections: [
        {
          title: '4.1 profiles',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['Column', 'Type', 'Purpose'],
                rows: [
                  ['id', 'uuid', 'Primary key mapped to auth.users.id'],
                  ['email', 'text', 'Unique email address'],
                  ['full_name', 'text', 'Display name'],
                  ['role', 'text', 'ADMIN or STAFF'],
                  ['department', 'text nullable', 'Optional organizational grouping'],
                  ['created_at', 'timestamptz', 'Creation timestamp'],
                ],
              },
            },
          ],
        },
        {
          title: '4.2 assets',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['Column', 'Type', 'Purpose'],
                rows: [
                  ['id', 'uuid', 'Primary key'],
                  ['asset_tag', 'text', 'Unique asset identifier'],
                  ['category', 'text', 'Laptop, monitor, keyboard, accessory, and similar'],
                  ['brand / model', 'text', 'Core asset metadata'],
                  ['serial_number', 'text nullable', 'Optional serial reference'],
                  ['status', 'text', 'IN_STOCK, ASSIGNED, IN_REPAIR, RETIRED'],
                  ['condition', 'text', 'NEW, GOOD, FAIR, DAMAGED'],
                  ['purchase_date / purchase_cost', 'date / numeric nullable', 'Commercial metadata'],
                  ['vendor / location', 'text nullable', 'Operational metadata'],
                  ['warranty_expiry', 'date nullable', 'Warranty tracking'],
                  ['notes', 'text nullable', 'Plain text notes'],
                  ['created_by / created_at / updated_at', 'uuid + timestamptz', 'Ownership and timestamps'],
                ],
              },
            },
          ],
        },
        {
          title: '4.3 asset_assignments',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['Column', 'Type', 'Purpose'],
                rows: [
                  ['id', 'uuid', 'Primary key'],
                  ['asset_id', 'uuid', 'References assets.id'],
                  ['user_id', 'uuid', 'References profiles.id'],
                  ['assigned_at', 'timestamptz', 'Assignment timestamp'],
                  ['returned_at', 'timestamptz nullable', 'Return timestamp'],
                  ['assigned_by', 'uuid', 'Actor who performed the assignment'],
                  ['note', 'text nullable', 'Optional assignment note'],
                ],
              },
            },
          ],
        },
        {
          title: '4.4 maintenance_logs',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['Column', 'Type', 'Purpose'],
                rows: [
                  ['id', 'uuid', 'Primary key'],
                  ['asset_id', 'uuid', 'References assets.id'],
                  ['issue', 'text', 'Problem description'],
                  ['status', 'text', 'OPEN, IN_PROGRESS, RESOLVED'],
                  ['vendor / cost', 'text / numeric nullable', 'Repair details'],
                  ['opened_at / resolved_at', 'timestamptz', 'Lifecycle timestamps'],
                  ['note', 'text nullable', 'Repair note'],
                  ['created_by', 'uuid', 'Actor who opened the record'],
                ],
              },
            },
          ],
        },
        {
          title: '4.5 asset_files and audit_logs',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['Table', 'Required Fields', 'Purpose'],
                rows: [
                  ['asset_files', 'asset_id, file_name, file_path, file_type, uploaded_by, created_at', 'Tracks documents and media stored in Supabase Storage'],
                  ['audit_logs', 'actor_id, action, entity_type, entity_id, detail jsonb, created_at', 'Captures important system actions with structured detail'],
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: '5. Security and Access Policy',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Enable Row Level Security on every core business table.',
            'Treat UI hiding as convenience only, never as authorization.',
            'Keep service-role keys server-only.',
            'Validate all writes on the server even when RLS is present.',
            'Keep audit logging server-controlled and non-optional for critical events.',
          ],
        },
      ],
      subsections: [
        {
          title: '5.1 Admin Access',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'Read and manage all assets, assignments, maintenance records, files, and audit logs.',
                'Create, update, return, retire, and delete records where deletion is explicitly allowed.',
              ],
            },
          ],
        },
        {
          title: '5.2 Staff Access',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'Read their own profile.',
                'Read their assigned assets and any additional scope explicitly approved in the product spec.',
                'Never access global audit logs or admin-only mutations.',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '6. Delivery Workflow Contract',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Phase', 'Goal', 'Strict Rule'],
            rows: [
              ['/spec', 'Define the technical specification', 'Spec before code. No implementation yet.'],
              ['/plan', 'Break the work into dependency-safe tasks', 'Each task must have a definition of done.'],
              ['/build', 'Implement one slice at a time', 'Verify each slice before the next one.'],
              ['/test', 'Prove the implementation works', 'Show commands, evidence, and failures honestly.'],
              ['/review', 'Audit for readability, security, and performance', 'Flag code smells and over-engineering.'],
              ['/ship', 'Prepare for production rollout', 'Always include a rollback plan.'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '6.1 Required Build Slices',
          blocks: [
            {
              kind: 'numbered',
              items: [
                'Supabase project setup, SQL schema, and RLS policies',
                'Auth migration and route protection',
                'Asset read paths, dashboard, and core CRUD',
                'Assignment history implementation',
                'Maintenance workflows',
                'Storage-backed file uploads',
                'Audit hardening and documentation',
              ],
            },
          ],
        },
        {
          title: '6.2 Definition of Done by Phase',
          blocks: [
            {
              kind: 'bullets',
              items: [
                '/spec is done when current state, target state, migration risks, and scope are explicit.',
                '/plan is done when tasks are atomic, ordered by dependency, and paired with verification.',
                '/build is done per slice only after the slice is proven to work.',
                '/test is done only when proof replaces assumptions.',
                '/review is done only when risks are either fixed or clearly documented.',
                '/ship is done only when deployment and rollback are operationally safe.',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '7. Verification and Ship Readiness',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Area', 'Required Evidence'],
            rows: [
              ['Lint', 'npm run lint passes'],
              ['Build', 'npm run build passes'],
              ['Auth', 'Admin and staff can sign in'],
              ['RBAC', 'Staff is blocked from admin-only actions and routes'],
              ['Assets', 'Create, edit, view, and search work correctly'],
              ['Assignments', 'Assign and return flows behave correctly'],
              ['Maintenance', 'Open and resolve flows behave correctly'],
              ['Storage', 'Uploads and access restrictions behave correctly'],
              ['Audit', 'Critical mutations create audit records'],
              ['RLS', 'Unauthorized reads and writes are rejected'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '7.1 Manual Critical Path',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'Sign in as admin with admin@company.com / admin123.',
                'Sign in as staff with staff@company.com / staff123.',
                'Request and complete a magic-link sign-in for an existing authorized user.',
                'Confirm that admin can access /audit.',
                'Confirm that staff cannot access /audit or admin-only mutations.',
                'Create and edit an asset as admin.',
                'Assign an asset to staff and verify visible scope.',
                'Upload a file to an asset.',
                'Open a maintenance record and resolve it.',
                'Verify audit entries for critical events.',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '8. Environment Blueprint and MVP Scope',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Variable', 'Purpose'],
            rows: [
              ['NEXT_PUBLIC_SUPABASE_URL', 'Supabase project URL'],
              ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Browser-safe anonymous key'],
              ['SUPABASE_SERVICE_ROLE_KEY', 'Server-only elevated operations'],
              ['NEXT_PUBLIC_SITE_URL', 'Canonical application URL'],
              ['DATABASE_URL', 'Optional direct Postgres access for migration tooling'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '8.1 MVP Inclusions',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'Login and route protection',
                'Admin and staff roles',
                'Dashboard overview',
                'Asset list, detail, create, and edit paths',
                'Assignment history',
                'Maintenance logs',
                'Audit logging',
                'File upload support',
                'Vercel deployment documentation',
              ],
            },
          ],
        },
        {
          title: '8.2 Explicit Exclusions',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'Barcode or QR scanning',
                'Multi-tenant architecture',
                'Workflow approvals',
                'Real-time subscriptions',
                'AI assistant features',
                'Heavy analytics dashboards',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '9. Project Definition of Done and Next Steps',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Vercel deployment is working.',
            'Supabase Hybrid Auth is live.',
            'Supabase Postgres schema and RLS policies are implemented.',
            'Admin login works with admin@company.com / admin123.',
            'Staff login works with staff@company.com / staff123.',
            'Password and magic-link sign-in both work for authorized users.',
            'Staff is blocked from admin-only behavior.',
            'Asset, maintenance, file, and audit workflows are verified.',
            'Setup and deployment documentation are current.',
            'Test evidence and review findings are complete.',
          ],
        },
        { kind: 'paragraph', text: 'If /test and /review are incomplete, the correct status is NOT READY.' },
        {
          kind: 'numbered',
          items: [
            'Freeze the approved production scope in /spec.',
            'Decide whether Prisma is removed immediately or through a short bridge.',
            'Create Supabase SQL schema and RLS policies first.',
            'Replace NextAuth with Supabase Auth and re-implement route protection.',
            'Keep seed and QA credentials aligned so the staff account uses staff123.',
            'Move assignment history into asset_assignments.',
            'Complete /test, /review, and /ship before declaring the migration done.',
          ],
        },
      ],
    },
  ],
}

const thaiBlueprint: Blueprint = {
  config: {
    fileName: 'IT-Asset-Tracker-Production-Grade-Blueprint-TH.docx',
    title: 'IT Asset Tracker',
    subtitle: 'คู่มือ Blueprint ระดับ Production-Grade',
    editionLabel: 'ฉบับภาษาไทย',
    preparedLabel: 'จัดทำเมื่อ',
    defaultFont: 'TH Sarabun New',
    headingColor: '1F4E79',
    bodySize: 28,
    heading1Size: 34,
    heading2Size: 30,
    heading3Size: 28,
  },
  intro: [
    'เอกสารฉบับนี้กำหนด blueprint สำหรับยกระดับ repository GitHub nattapongsindhu/it-asset-tracker ให้เป็นระบบจัดการทรัพย์สิน IT ภายในองค์กรที่พร้อมใช้งานจริงบน Vercel และ Supabase',
    'เนื้อหาอ้างอิงจากสถานะจริงของ repository ที่ตรวจสอบในเครื่อง และจัดโครงสร้างตาม workflow ด้านวิศวกรรมที่ต้องทำตามอย่างเคร่งครัด ได้แก่ /spec, /plan, /build, /test, /review และ /ship',
  ],
  sections: [
    {
      title: '1. สถานะปัจจุบันของระบบ',
      blocks: [
        { kind: 'paragraph', text: 'repository ปัจจุบันเป็น internal tool ที่ใช้งานได้จริงอยู่แล้ว ดังนั้นแนวทางที่ถูกต้องคือ migration และ hardening อย่างเป็นระบบ ไม่ใช่การเขียนใหม่ทั้งระบบแบบไม่มีการควบคุมความเสี่ยง' },
        {
          kind: 'table',
          table: {
            headers: ['หัวข้อ', 'สถานะปัจจุบัน'],
            rows: [
              ['Framework', 'Next.js 14 App Router'],
              ['ภาษา', 'TypeScript 5'],
              ['Styling', 'Tailwind CSS 3'],
              ['Data Layer', 'Prisma 5 ร่วมกับ SQLite'],
              ['Authentication', 'NextAuth v4 แบบ Credentials'],
              ['Validation', 'Zod'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '1.1 Route ที่มีอยู่ในระบบ',
          blocks: [
            {
              kind: 'bullets',
              items: ['/login', '/dashboard', '/assets', '/assets/new', '/assets/[id]', '/assets/[id]/edit', '/audit'],
            },
          ],
        },
        {
          title: '1.2 กฎธุรกิจที่ยืนยันแล้วจากโค้ดปัจจุบัน',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'ระบบมี 2 บทบาท คือ ADMIN และ STAFF',
                'สถานะของทรัพย์สินคือ IN_STOCK, ASSIGNED, IN_REPAIR และ RETIRED',
                'Staff ไม่มีสิทธิ์สร้าง แก้ไข หรือลบ asset',
                'หน้า Audit Log เป็นสิทธิ์ของ Admin เท่านั้น',
                'ทุก mutation สำคัญมีการตรวจสิทธิ์ฝั่ง server ก่อนเขียนฐานข้อมูล',
                'หมายเหตุของ asset แสดงผลเป็น plain text เพื่อลดความเสี่ยง XSS',
              ],
            },
          ],
        },
        {
          title: '1.3 ข้อจำกัดของระบบปัจจุบัน',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'ประวัติการมอบหมาย asset ยังถูกเก็บแบบแบนใน assignedUserId ของ asset',
                'งานซ่อมบำรุงยังถูกแทนด้วย status และ notes เป็นหลัก',
                'ยังไม่มีระบบจัดเก็บไฟล์สำหรับใบเสร็จ ใบรับประกัน หรือรูปภาพอุปกรณ์',
                'SQLite และ local credentials auth ยังไม่เหมาะเป็น backbone ของ production บน Vercel',
              ],
            },
          ],
        },
        {
          title: '1.4 บัญชีสำหรับ demo และการทดสอบ',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['บทบาท', 'credential ปัจจุบันจาก seed', 'credential ที่ต้องใช้ใน blueprint production'],
                rows: [
                  ['Admin', 'admin@company.com / admin123', 'admin@company.com / admin123'],
                  ['Staff', 'staff@company.com / staff123', 'staff@company.com / staff123'],
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: '2. เป้าหมายของ production version',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'deploy ระบบบน Vercel',
            'ใช้ Supabase Hybrid Auth สำหรับทั้ง Email + Password และ Magic Link',
            'เปิดใช้ Magic Link เฉพาะกับผู้ใช้ที่มีบัญชีอยู่แล้ว และไม่เปิด public signup',
            'ใช้ Supabase Postgres เป็นฐานข้อมูลหลัก',
            'ใช้ Supabase Storage สำหรับไฟล์ของ asset',
            'คง RBAC และ auditability ให้เป็นข้อกำหนดหลัก',
            'รักษาพฤติกรรมทางธุรกิจเดิมที่ถูกต้อง พร้อมยกระดับความพร้อมใช้งานจริง',
          ],
        },
      ],
    },
    {
      title: '3. สถาปัตยกรรมเป้าหมาย',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Layer', 'ทางเลือกสำหรับ production', 'เหตุผล'],
            rows: [
              ['Frontend', 'Next.js App Router', 'รักษาแนวทางเดิมของแอปและเหมาะกับ Vercel'],
              ['Hosting', 'Vercel', 'deploy ง่าย มี preview environment และเหมาะกับ Next.js'],
              ['Authentication', 'Supabase Auth', 'ลดความซับซ้อนของ auth และเชื่อมกับ data platform ได้ตรงกว่า'],
              ['Database', 'Supabase Postgres', 'เหมาะกับข้อมูลเชิงสัมพันธ์ของ asset, assignment และ audit log'],
              ['Storage', 'Supabase Storage', 'รองรับไฟล์ใบเสร็จ ใบรับประกัน และภาพอุปกรณ์'],
              ['Security', 'Supabase RLS + server checks', 'ป้องกันข้อมูลทั้งที่ชั้นฐานข้อมูลและชั้นแอปพลิเคชัน'],
            ],
          },
        },
        {
          kind: 'paragraph',
          text: 'หลักการ migration ที่แนะนำคือค่อย ๆ เปลี่ยนไปสู่ stack ที่เรียบง่ายกว่าใน production โดยลดบทบาทของ Prisma + SQLite + NextAuth ออกจากเส้นทาง production สุดท้าย เว้นแต่จะมีเหตุผลชัดเจนใน /spec ว่าต้องมี bridge ชั่วคราว',
        },
      ],
    },
    {
      title: '4. โครงสร้างข้อมูลที่แนะนำ',
      blocks: [
        { kind: 'paragraph', text: 'schema สำหรับ production ควรขยายจากของเดิมเพื่อเก็บประวัติ รองรับการอัปโหลดไฟล์ และทำให้ audit มีคุณภาพมากขึ้น' },
      ],
      subsections: [
        {
          title: '4.1 profiles',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['คอลัมน์', 'ชนิดข้อมูล', 'วัตถุประสงค์'],
                rows: [
                  ['id', 'uuid', 'primary key ที่ผูกกับ auth.users.id'],
                  ['email', 'text', 'อีเมลที่ไม่ซ้ำกัน'],
                  ['full_name', 'text', 'ชื่อสำหรับแสดงผล'],
                  ['role', 'text', 'ADMIN หรือ STAFF'],
                  ['department', 'text nullable', 'ข้อมูลหน่วยงานถ้ามี'],
                  ['created_at', 'timestamptz', 'เวลาที่สร้างข้อมูล'],
                ],
              },
            },
          ],
        },
        {
          title: '4.2 assets',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['คอลัมน์', 'ชนิดข้อมูล', 'วัตถุประสงค์'],
                rows: [
                  ['id', 'uuid', 'primary key'],
                  ['asset_tag', 'text', 'รหัสทรัพย์สินที่ไม่ซ้ำ'],
                  ['category', 'text', 'เช่น laptop, monitor, keyboard, accessory'],
                  ['brand / model', 'text', 'ข้อมูลหลักของอุปกรณ์'],
                  ['serial_number', 'text nullable', 'หมายเลข serial ถ้ามี'],
                  ['status', 'text', 'IN_STOCK, ASSIGNED, IN_REPAIR, RETIRED'],
                  ['condition', 'text', 'NEW, GOOD, FAIR, DAMAGED'],
                  ['purchase_date / purchase_cost', 'date / numeric nullable', 'ข้อมูลด้านการจัดซื้อ'],
                  ['vendor / location', 'text nullable', 'ข้อมูลการปฏิบัติงาน'],
                  ['warranty_expiry', 'date nullable', 'วันหมดประกัน'],
                  ['notes', 'text nullable', 'หมายเหตุแบบ plain text'],
                  ['created_by / created_at / updated_at', 'uuid + timestamptz', 'เจ้าของข้อมูลและเวลา'],
                ],
              },
            },
          ],
        },
        {
          title: '4.3 asset_assignments',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['คอลัมน์', 'ชนิดข้อมูล', 'วัตถุประสงค์'],
                rows: [
                  ['id', 'uuid', 'primary key'],
                  ['asset_id', 'uuid', 'อ้างอิง assets.id'],
                  ['user_id', 'uuid', 'อ้างอิง profiles.id'],
                  ['assigned_at', 'timestamptz', 'เวลามอบหมาย'],
                  ['returned_at', 'timestamptz nullable', 'เวลาคืนอุปกรณ์'],
                  ['assigned_by', 'uuid', 'ผู้ดำเนินการมอบหมาย'],
                  ['note', 'text nullable', 'หมายเหตุการมอบหมาย'],
                ],
              },
            },
          ],
        },
        {
          title: '4.4 maintenance_logs',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['คอลัมน์', 'ชนิดข้อมูล', 'วัตถุประสงค์'],
                rows: [
                  ['id', 'uuid', 'primary key'],
                  ['asset_id', 'uuid', 'อ้างอิง assets.id'],
                  ['issue', 'text', 'รายละเอียดปัญหา'],
                  ['status', 'text', 'OPEN, IN_PROGRESS, RESOLVED'],
                  ['vendor / cost', 'text / numeric nullable', 'ข้อมูลการซ่อม'],
                  ['opened_at / resolved_at', 'timestamptz', 'ช่วงเวลาของงานซ่อม'],
                  ['note', 'text nullable', 'หมายเหตุการซ่อม'],
                  ['created_by', 'uuid', 'ผู้เปิดรายการซ่อม'],
                ],
              },
            },
          ],
        },
        {
          title: '4.5 asset_files และ audit_logs',
          blocks: [
            {
              kind: 'table',
              table: {
                headers: ['ตาราง', 'field สำคัญ', 'วัตถุประสงค์'],
                rows: [
                  ['asset_files', 'asset_id, file_name, file_path, file_type, uploaded_by, created_at', 'เก็บ metadata ของไฟล์ที่อยู่ใน Supabase Storage'],
                  ['audit_logs', 'actor_id, action, entity_type, entity_id, detail jsonb, created_at', 'เก็บเหตุการณ์สำคัญของระบบแบบมีโครงสร้าง'],
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: '5. นโยบายความปลอดภัยและสิทธิ์การเข้าถึง',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'เปิดใช้ Row Level Security กับทุกตารางธุรกิจหลัก',
            'การซ่อนปุ่มหรือเมนูใน UI ถือเป็นเพียง convenience ไม่ใช่ authorization',
            'service-role key ต้องอยู่ฝั่ง server เท่านั้น',
            'ทุกการเขียนข้อมูลต้องมี validation ฝั่ง server แม้จะมี RLS อยู่แล้ว',
            'audit logging ต้องถูกควบคุมจากฝั่ง server และเป็นข้อบังคับสำหรับเหตุการณ์สำคัญ',
          ],
        },
      ],
      subsections: [
        {
          title: '5.1 สิทธิ์ของ Admin',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'อ่านและจัดการ asset, assignment, maintenance, file และ audit log ได้ทั้งหมด',
                'สร้าง แก้ไข คืน ปลดระวาง และลบข้อมูลในกรณีที่ระบบอนุญาตอย่างชัดเจน',
              ],
            },
          ],
        },
        {
          title: '5.2 สิทธิ์ของ Staff',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'อ่านข้อมูล profile ของตนเอง',
                'อ่าน asset ที่ถูกมอบหมายให้ตนเอง และ scope เพิ่มเติมที่ระบุไว้ชัดเจนใน product spec',
                'ไม่มีสิทธิ์ดู audit log รวมของระบบ และไม่มีสิทธิ์ทำ mutation ฝั่ง admin',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '6. สัญญาการทำงานตาม workflow',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['Phase', 'เป้าหมาย', 'กฎที่ห้ามข้าม'],
            rows: [
              ['/spec', 'นิยาม technical specification', 'Spec ต้องมาก่อน code และห้ามเริ่ม implementation'],
              ['/plan', 'แตกงานเป็น task ที่พึ่งพากันอย่างถูกลำดับ', 'ทุก task ต้องมี definition of done'],
              ['/build', 'พัฒนาเป็น slice เล็กทีละส่วน', 'ต้อง verify แต่ละ slice ก่อนขึ้นงานถัดไป'],
              ['/test', 'พิสูจน์ว่างานใช้ได้จริง', 'ต้องมีคำสั่งที่รันและหลักฐานจริง'],
              ['/review', 'ตรวจคุณภาพด้าน readability, security, performance', 'ต้อง flag code smell และ over-engineering'],
              ['/ship', 'เตรียม rollout ขึ้น production', 'ต้องมี rollback plan เสมอ'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '6.1 ลำดับ build slice ที่แนะนำ',
          blocks: [
            {
              kind: 'numbered',
              items: [
                'ตั้งค่า Supabase project, SQL schema และ RLS policy',
                'ย้าย auth และ route protection',
                'ย้ายเส้นทางอ่านข้อมูล asset, dashboard และ core CRUD',
                'เพิ่มประวัติการมอบหมายผ่าน asset_assignments',
                'เพิ่ม maintenance workflow',
                'เพิ่ม file upload บน storage',
                'ปรับปรุง audit และเอกสารประกอบ',
              ],
            },
          ],
        },
        {
          title: '6.2 Definition of Done ของแต่ละ phase',
          blocks: [
            {
              kind: 'bullets',
              items: [
                '/spec เสร็จเมื่อ current state, target state, migration risk และ scope ถูกนิยามชัดเจน',
                '/plan เสร็จเมื่อ task มีขนาดเล็ก เรียงตาม dependency และมี verification กำกับ',
                '/build เสร็จเป็นราย slice ได้ต่อเมื่อพิสูจน์แล้วว่า slice นั้นทำงานจริง',
                '/test เสร็จเมื่อ proof แทนที่ assumption',
                '/review เสร็จเมื่อความเสี่ยงสำคัญถูกแก้หรือถูกบันทึกอย่างตรงไปตรงมา',
                '/ship เสร็จเมื่อ deployment และ rollback ปลอดภัยในเชิงปฏิบัติการ',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '7. การทดสอบและความพร้อมสำหรับการปล่อยระบบ',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['พื้นที่ตรวจสอบ', 'หลักฐานที่ต้องมี'],
            rows: [
              ['Lint', 'npm run lint ผ่าน'],
              ['Build', 'npm run build ผ่าน'],
              ['Auth', 'Admin และ Staff เข้าสู่ระบบได้'],
              ['RBAC', 'Staff ถูกบล็อกจาก action และ route ของ admin'],
              ['Assets', 'สร้าง แก้ไข ดู และค้นหาได้ถูกต้อง'],
              ['Assignments', 'การมอบหมายและคืน asset ถูกต้อง'],
              ['Maintenance', 'การเปิดและปิดงานซ่อมถูกต้อง'],
              ['Storage', 'อัปโหลดไฟล์และการจำกัดสิทธิ์ทำงานถูกต้อง'],
              ['Audit', 'mutation สำคัญสร้าง audit record ได้'],
              ['RLS', 'การเข้าถึงที่ไม่ได้รับอนุญาตถูกปฏิเสธ'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '7.1 Manual critical path ที่ต้องตรวจ',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'เข้าสู่ระบบเป็น admin ด้วย admin@company.com / admin123',
                'เข้าสู่ระบบเป็น staff ด้วย staff@company.com / staff123',
                'ทดสอบขอและใช้งาน Magic Link สำหรับผู้ใช้ที่มีสิทธิ์อยู่แล้ว',
                'ยืนยันว่า admin เข้า /audit ได้',
                'ยืนยันว่า staff เข้า /audit หรือทำ action แบบ admin ไม่ได้',
                'สร้างและแก้ไข asset ด้วยบัญชี admin',
                'มอบหมาย asset ให้ staff และตรวจ scope การมองเห็น',
                'อัปโหลดไฟล์ให้ asset',
                'เปิด maintenance record และปิดงานซ่อม',
                'ตรวจว่ามี audit log สำหรับเหตุการณ์สำคัญ',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '8. Environment blueprint และขอบเขต MVP',
      blocks: [
        {
          kind: 'table',
          table: {
            headers: ['ตัวแปร', 'หน้าที่'],
            rows: [
              ['NEXT_PUBLIC_SUPABASE_URL', 'URL ของ Supabase project'],
              ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anonymous key ที่ใช้ได้ฝั่ง browser'],
              ['SUPABASE_SERVICE_ROLE_KEY', 'key สำหรับงานฝั่ง server เท่านั้น'],
              ['NEXT_PUBLIC_SITE_URL', 'URL หลักของแอป'],
              ['DATABASE_URL', 'การเข้าถึง Postgres โดยตรงสำหรับ migration tooling ถ้าจำเป็น'],
            ],
          },
        },
      ],
      subsections: [
        {
          title: '8.1 สิ่งที่ต้องอยู่ใน MVP',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'ระบบ login และ route protection',
                'บทบาท Admin และ Staff',
                'dashboard overview',
                'asset list, detail, create และ edit',
                'assignment history',
                'maintenance log',
                'audit logging',
                'file upload support',
                'เอกสาร deployment บน Vercel',
              ],
            },
          ],
        },
        {
          title: '8.2 สิ่งที่ตัดออกจาก MVP อย่างชัดเจน',
          blocks: [
            {
              kind: 'bullets',
              items: [
                'barcode หรือ QR scanning',
                'multi-tenant architecture',
                'workflow approvals',
                'real-time subscriptions',
                'AI assistant features',
                'analytics dashboard ที่ซับซ้อนเกินจำเป็น',
              ],
            },
          ],
        },
      ],
    },
    {
      title: '9. Definition of Done ของโปรเจกต์และขั้นตอนถัดไป',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'deploy บน Vercel ได้จริง',
            'Supabase Hybrid Auth ใช้งานได้จริง',
            'Supabase Postgres schema และ RLS policy ถูกใช้งานแล้ว',
            'Admin login ใช้ admin@company.com / admin123 ได้',
            'Staff login ใช้ staff@company.com / staff123 ได้',
            'ทั้ง Password และ Magic Link ใช้งานได้สำหรับผู้ใช้ที่ได้รับอนุญาต',
            'Staff ถูกบล็อกจากพฤติกรรมแบบ admin',
            'workflow ของ asset, maintenance, file และ audit ถูก verify แล้ว',
            'เอกสาร setup และ deployment เป็นปัจจุบัน',
            'มีหลักฐานจาก /test และผลจาก /review ครบ',
          ],
        },
        { kind: 'paragraph', text: 'หาก /test และ /review ยังไม่ครบ สถานะที่ถูกต้องคือ NOT READY' },
        {
          kind: 'numbered',
          items: [
            'ล็อก scope ของ production ด้วย /spec ให้ชัดเจน',
            'ตัดสินใจว่าจะถอด Prisma ทันที หรือใช้ bridge ชั่วคราว',
            'เริ่มจาก Supabase SQL schema และ RLS policy ก่อน',
            'แทนที่ NextAuth ด้วย Supabase Auth และทำ route protection ใหม่',
            'คง seed และ QA credential ให้ staff ใช้ staff123',
            'ย้ายประวัติการมอบหมายไปที่ asset_assignments',
            'ทำ /test, /review และ /ship ให้ครบก่อนประกาศว่างาน migration เสร็จ',
          ],
        },
      ],
    },
  ],
}

async function writeDoc(blueprint: Blueprint) {
  const outDir = path.join(process.cwd(), 'docs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  const doc = buildDoc(blueprint)
  const buffer = await Packer.toBuffer(doc)
  const outPath = path.join(outDir, blueprint.config.fileName)
  const htmlPath = outPath.replace(/\.docx$/i, '.html')

  fs.writeFileSync(outPath, buffer)
  fs.writeFileSync(htmlPath, buildHtml(blueprint), 'utf8')
  console.log(`Generated: ${outPath}`)
  console.log(`Generated: ${htmlPath}`)
}

async function main() {
  await writeDoc(englishBlueprint)
  await writeDoc(thaiBlueprint)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
