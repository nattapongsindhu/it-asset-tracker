import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
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

function heading(text: string, level: HeadingLevel) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
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
    spacing: { after: 80 },
  })
}

function codeLine(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Consolas', size: 20 })],
    spacing: { after: 40 },
  })
}

function tableHeader(cells: string[]) {
  return new TableRow({
    children: cells.map((text) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: true, size: 22, color: 'FFFFFF' })],
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

const generatedAt = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

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
          children: [new TextRun({ text: '', break: 5 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'IT Asset Tracker', bold: true, size: 40, color: '1F4E79' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Vercel + Supabase Project Blueprint', bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Prepared on ${generatedAt}`, italics: true, size: 22, color: '666666' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
        }),
        body(
          'This document is the practical development blueprint for evolving IT Asset Tracker into a production-ready internal web application using Next.js on Vercel and Supabase for authentication, database, storage, and security policies.'
        ),
        new Paragraph({ children: [new PageBreak()] }),

        heading('1. Product Vision', HeadingLevel.HEADING_1),
        body(
          'Build a clean internal asset management application for small teams that is simple to maintain, fast to use, and realistic for day-to-day IT operations.'
        ),
        bullet('Keep the interface minimal and business-like.')
        ,
        bullet('Support real operational workflows instead of demo-only features.'),
        bullet('Use as few moving parts as possible while still covering core needs.'),
        bullet('Favor clear data modeling, role-based access, and auditability.'),

        heading('2. Core Product Goals', HeadingLevel.HEADING_1),
        bullet('Track laptops, monitors, keyboards, peripherals, and accessories.'),
        bullet('Know who currently holds each asset.'),
        bullet('Record repair history and warranty visibility.'),
        bullet('Attach receipts, warranty files, or photos to assets.'),
        bullet('Allow administrators to search, update, assign, return, and retire assets.'),
        bullet('Allow staff to sign in and view only what is relevant to them.'),
        bullet('Keep an audit trail for important actions.'),

        heading('3. Recommended Stack', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['Layer', 'Choice', 'Why']),
            tableRow(['Frontend', 'Next.js App Router', 'Works well with Vercel and supports server components and server actions.']),
            tableRow(['Hosting', 'Vercel', 'Simple deployment, preview environments, and excellent fit for Next.js.']),
            tableRow(['Auth', 'Supabase Auth (Hybrid)', 'Supports both email/password and magic link sign-in while keeping identity close to the database layer.']),
            tableRow(['Database', 'Supabase Postgres', 'Reliable relational data model for assets, assignments, and logs.']),
            tableRow(['Storage', 'Supabase Storage', 'Good fit for receipts, warranty PDFs, and asset photos.']),
            tableRow(['Validation', 'Zod', 'Simple, explicit validation for forms and server actions.']),
            tableRow(['Styling', 'Tailwind CSS', 'Fast to build and easy to keep visually consistent.']),
          ],
        }),
        body(
          'Important architectural decision: prefer Supabase directly over keeping both Prisma and NextAuth in the production design. The simpler stack is easier to deploy, debug, and document.'
        ),

        heading('4. MVP Feature Scope', HeadingLevel.HEADING_1),
        heading('4.1 Authentication', HeadingLevel.HEADING_2),
        bullet('Hybrid sign-in: email/password and magic link.'),
        bullet('Role support: ADMIN and STAFF.'),
        bullet('Protected application routes.'),
        bullet('Allow magic-link access only for existing users; no public signup.'),

        heading('4.2 Asset Management', HeadingLevel.HEADING_2),
        bullet('Create, edit, view, and retire assets.'),
        bullet('Search by asset tag, brand, model, serial number, or assignee.'),
        bullet('Filter by status, category, and warranty state.'),

        heading('4.3 Assignment Tracking', HeadingLevel.HEADING_2),
        bullet('Assign asset to a staff member.'),
        bullet('Return asset back to stock.'),
        bullet('Keep assignment history instead of only storing the current assignee.'),

        heading('4.4 Maintenance', HeadingLevel.HEADING_2),
        bullet('Open repair record.'),
        bullet('Track repair status and optional vendor/cost.'),
        bullet('Close repair record with notes and resolved date.'),

        heading('4.5 Documents', HeadingLevel.HEADING_2),
        bullet('Upload receipt, warranty PDF, or device photo.'),
        bullet('Store files under the related asset.'),

        heading('4.6 Audit Log', HeadingLevel.HEADING_2),
        bullet('Track login, asset creation, updates, assignment, return, repair, and retirement events.'),

        heading('5. Features Intentionally Excluded From MVP', HeadingLevel.HEADING_1),
        bullet('No barcode or QR scanning in phase one.'),
        bullet('No workflow approvals.'),
        bullet('No multi-organization tenancy.'),
        bullet('No real-time subscriptions.'),
        bullet('No AI assistant features.'),
        bullet('No complicated analytics dashboards.'),

        heading('6. User Roles', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['Role', 'Access Level']),
            tableRow(['ADMIN', 'Full access to assets, assignments, maintenance, users, files, reports, and audit logs.']),
            tableRow(['STAFF', 'Read access to assigned assets and limited self-service visibility.']),
          ],
        }),

        heading('7. Proposed Data Model', HeadingLevel.HEADING_1),
        body('The following relational model keeps the system simple while preserving useful history.'),

        heading('7.1 profiles', HeadingLevel.HEADING_2),
        bullet('id uuid primary key'),
        bullet('email text unique'),
        bullet('full_name text'),
        bullet('role text check ADMIN or STAFF'),
        bullet('department text nullable'),
        bullet('created_at timestamptz'),

        heading('7.2 assets', HeadingLevel.HEADING_2),
        bullet('id uuid primary key'),
        bullet('asset_tag text unique'),
        bullet('category text'),
        bullet('brand text'),
        bullet('model text'),
        bullet('serial_number text nullable'),
        bullet('status text check IN_STOCK, ASSIGNED, IN_REPAIR, RETIRED'),
        bullet('condition text check NEW, GOOD, FAIR, DAMAGED'),
        bullet('purchase_date date nullable'),
        bullet('purchase_cost numeric nullable'),
        bullet('vendor text nullable'),
        bullet('location text nullable'),
        bullet('warranty_expiry date nullable'),
        bullet('notes text nullable'),
        bullet('created_by uuid'),
        bullet('created_at timestamptz'),
        bullet('updated_at timestamptz'),

        heading('7.3 asset_assignments', HeadingLevel.HEADING_2),
        bullet('id uuid primary key'),
        bullet('asset_id uuid foreign key'),
        bullet('user_id uuid foreign key'),
        bullet('assigned_at timestamptz'),
        bullet('returned_at timestamptz nullable'),
        bullet('assigned_by uuid'),
        bullet('note text nullable'),

        heading('7.4 maintenance_logs', HeadingLevel.HEADING_2),
        bullet('id uuid primary key'),
        bullet('asset_id uuid foreign key'),
        bullet('issue text'),
        bullet('status text check OPEN, IN_PROGRESS, RESOLVED'),
        bullet('vendor text nullable'),
        bullet('cost numeric nullable'),
        bullet('opened_at timestamptz'),
        bullet('resolved_at timestamptz nullable'),
        bullet('note text nullable'),
        bullet('created_by uuid'),

        heading('7.5 asset_files', HeadingLevel.HEADING_2),
        bullet('id uuid primary key'),
        bullet('asset_id uuid foreign key'),
        bullet('file_name text'),
        bullet('file_path text'),
        bullet('file_type text'),
        bullet('uploaded_by uuid'),
        bullet('created_at timestamptz'),

        heading('7.6 audit_logs', HeadingLevel.HEADING_2),
        bullet('id uuid primary key'),
        bullet('actor_id uuid nullable'),
        bullet('action text'),
        bullet('entity_type text'),
        bullet('entity_id uuid nullable'),
        bullet('detail jsonb nullable'),
        bullet('created_at timestamptz'),

        heading('8. App Routes', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableHeader(['Route', 'Purpose']),
            tableRow(['/login', 'Authentication entry point.']),
            tableRow(['/dashboard', 'Operational summary and recent activity.']),
            tableRow(['/assets', 'Searchable asset inventory.']),
            tableRow(['/assets/new', 'Create asset form for admins.']),
            tableRow(['/assets/[id]', 'Asset detail and history.']),
            tableRow(['/assets/[id]/edit', 'Edit asset metadata.']),
            tableRow(['/assignments', 'Assignment and return overview.']),
            tableRow(['/maintenance', 'Repair queue and maintenance records.']),
            tableRow(['/audit', 'Administrator audit trail view.']),
            tableRow(['/settings/users', 'Basic user and role administration.']),
          ],
        }),

        heading('9. Dashboard Design', HeadingLevel.HEADING_1),
        body('The dashboard should feel operational and direct, not decorative.'),
        bullet('Top cards: total assets, in stock, assigned, in repair, retired.'),
        bullet('Second row: warranty expiring in 30 days, open repairs, recent assignments.'),
        bullet('Bottom section: recent audit events and recent asset changes.'),
        bullet('Keep charts optional. Cards and compact tables are enough for MVP.'),

        heading('10. Security Plan', HeadingLevel.HEADING_1),
        bullet('Use Supabase Hybrid Auth for identity and session flows.'),
        bullet('Enable Row Level Security on all core tables.'),
        bullet('Admins can read and write all business tables.'),
        bullet('Staff can only read their own profile and assigned assets.'),
        bullet('Allow magic links only for pre-provisioned users.'),
        bullet('Validate all writes on the server.'),
        bullet('Log important mutations to audit_logs.'),
        bullet('Do not expose service role keys to the browser.'),

        heading('11. Storage Conventions', HeadingLevel.HEADING_1),
        bullet('Bucket name: asset-files'),
        bullet('Store files under assets/{asset_id}/...'),
        bullet('Examples: assets/abc123/receipt.pdf, assets/abc123/front-photo.jpg'),
        bullet('Restrict access through signed URLs or controlled server-side fetches when needed.'),

        heading('12. Suggested Folder Structure', HeadingLevel.HEADING_1),
        codeLine('app/(auth)/login/page.tsx'),
        codeLine('app/(app)/dashboard/page.tsx'),
        codeLine('app/(app)/assets/page.tsx'),
        codeLine('app/(app)/assets/new/page.tsx'),
        codeLine('app/(app)/assets/[id]/page.tsx'),
        codeLine('app/(app)/maintenance/page.tsx'),
        codeLine('app/(app)/audit/page.tsx'),
        codeLine('lib/supabase/server.ts'),
        codeLine('lib/supabase/client.ts'),
        codeLine('lib/auth/guards.ts'),
        codeLine('lib/db/assets.ts'),
        codeLine('lib/db/assignments.ts'),
        codeLine('lib/db/maintenance.ts'),
        codeLine('lib/db/audit.ts'),
        codeLine('lib/validators/assets.ts'),
        codeLine('lib/validators/maintenance.ts'),

        heading('13. Migration Plan From Current Version', HeadingLevel.HEADING_1),
        bullet('Replace SQLite with Supabase Postgres.'),
        bullet('Replace NextAuth credentials flow with Supabase Hybrid Auth.'),
        bullet('Move current asset assignment logic out of the assets table into asset_assignments.'),
        bullet('Preserve audit logging, but store richer details as jsonb.'),
        bullet('Add storage-backed file uploads for receipts and warranty documents.'),
        bullet('Add maintenance_logs as a first-class table instead of keeping all notes inside assets.'),

        heading('14. Development Phases', HeadingLevel.HEADING_1),
        heading('Phase 1 - Foundation', HeadingLevel.HEADING_2),
        bullet('Set up Supabase project, schema, and RLS.'),
        bullet('Connect app to Supabase Hybrid Auth.'),
        bullet('Implement login, dashboard shell, asset list, and asset CRUD.'),

        heading('Phase 2 - Operational Workflows', HeadingLevel.HEADING_2),
        bullet('Implement assignments and returns.'),
        bullet('Implement maintenance logs.'),
        bullet('Add audit logging to all key mutations.'),

        heading('Phase 3 - Practical Enhancements', HeadingLevel.HEADING_2),
        bullet('Implement file uploads.'),
        bullet('Add warranty filters and expiring-soon views.'),
        bullet('Add basic reports and CSV export.'),

        heading('15. Definition of Done For MVP', HeadingLevel.HEADING_1),
        bullet('Admin can sign in, create assets, assign them, return them, retire them, and view audit logs.'),
        bullet('Staff can sign in and view assigned assets.'),
        bullet('Assets can have file attachments.'),
        bullet('Repairs can be opened and resolved.'),
        bullet('The app deploys cleanly on Vercel with Supabase as the only backend platform dependency.'),
        bullet('Seed data or onboarding docs exist for first-time setup.'),

        heading('16. Recommended Project Positioning', HeadingLevel.HEADING_1),
        body(
          'Use this project as a practical internal tools portfolio piece. The strongest framing is: a clean IT asset management application for small teams, built with Next.js, Vercel, and Supabase.'
        ),

        heading('17. Immediate Next Steps', HeadingLevel.HEADING_1),
        bullet('Create Supabase SQL schema and RLS policies.'),
        bullet('Refactor authentication to Supabase Hybrid Auth.'),
        bullet('Implement assets and assignment data access layer.'),
        bullet('Ship dashboard and asset CRUD before adding maintenance and file uploads.'),
      ],
    },
  ],
})

async function main() {
  const outDir = path.join(process.cwd(), 'docs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  const buffer = await Packer.toBuffer(doc)
  const outPath = path.join(outDir, 'IT-Asset-Tracker-Vercel-Supabase-Blueprint.docx')
  fs.writeFileSync(outPath, buffer)
  console.log(`Generated: ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
