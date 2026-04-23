import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { AppShell } from '@/app/components/AppShell'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseUser } from '@/lib/supabase/session'
import { DeleteAssetButton } from './DeleteAssetButton'

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'Assigned',
  IN_REPAIR: 'In Repair',
  RETIRED: 'Retired',
}

type Props = { params: { id: string } }

function formatValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : '-'
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined,
  }).format(new Date(value))
}

export default async function AssetDetailPage({ params }: Props) {
  const user = await requireSupabaseUser()
  const isAdmin = user.role === 'ADMIN'
  const supabase = createSupabaseServerClient()

  const { data: asset } = await supabase
    .from('assets')
    .select(
      'id, asset_tag, category, brand, model, serial_number, status, assigned_user_id, warranty_expiry, notes, created_at, updated_at'
    )
    .eq('id', params.id)
    .maybeSingle()

  if (!asset) {
    notFound()
  }

  let assignedUserName = '-'

  if (asset.assigned_user_id) {
    const { data: assignedUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', asset.assigned_user_id)
      .maybeSingle()

    assignedUserName = assignedUser?.email ?? '-'
  }

  const rows = [
    { label: 'Asset Tag', value: formatValue(asset.asset_tag) },
    { label: 'Type', value: formatValue(asset.category) },
    { label: 'Brand', value: formatValue(asset.brand) },
    { label: 'Model', value: formatValue(asset.model) },
    { label: 'Serial Number', value: formatValue(asset.serial_number) },
    { label: 'Status', value: STATUS_LABELS[asset.status ?? ''] ?? asset.status ?? '-' },
    { label: 'Assigned To', value: assignedUserName },
    { label: 'Warranty Expiry', value: formatDate(asset.warranty_expiry) },
    { label: 'Created', value: formatDate(asset.created_at) },
    { label: 'Last Updated', value: formatDate(asset.updated_at) },
    { label: 'Notes', value: formatValue(asset.notes) },
  ]

  return (
    <AppShell currentPath="/dashboard/assets" user={user}>
      <section className="print-sheet mx-auto max-w-4xl">
        <div className="print-page-header mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/assets"
              className="print-hide text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Back to assets
            </Link>
            <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-slate-900">
              {asset.asset_tag ?? params.id}
            </h1>
            <p className="print-hide mt-3 text-sm leading-7 text-slate-600">
              Review the current asset record, assignment, and timestamps in a compact detail view.
            </p>
          </div>

          <div className="print-hide flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Link
                href={`/assets/${params.id}/edit`}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </span>
              </Link>
            )}
            {isAdmin && <DeleteAssetButton id={params.id} assetTag={asset.asset_tag ?? params.id} />}
          </div>
        </div>

        <div className="print-card overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          {rows.map(row => (
            <div
              key={row.label}
              className="print-detail-row flex flex-col gap-2 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:flex-row"
            >
              <span className="print-detail-label w-44 shrink-0 text-sm font-medium text-slate-500">
                {row.label}
              </span>
              <span className="print-detail-value text-sm leading-7 text-slate-800">{row.value}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
