import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Boxes, MapPin, UserCircle2 } from 'lucide-react'
import { AppShell } from '@/app/components/AppShell'
import { AssetRepairRequestButton } from '@/app/components/AssetRepairRequestButton'
import { LocalizedDateTime } from '@/app/components/LocalizedDateTime'
import { formatLocationLabel, type AssetLocationRow } from '@/lib/locations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseUser } from '@/lib/supabase/session'
import type { AssetStatus } from '@/types/app'

type AssetRow = {
  asset_tag: string | null
  brand: string | null
  category: string | null
  id: string
  location: AssetLocationRow[] | AssetLocationRow | null
  model: string | null
  status: AssetStatus | null
  updated_at: string | null
  warranty_expiry: string | null
}

const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'In Use',
  IN_REPAIR: 'Under Repair',
  RETIRED: 'Retired',
}

function unwrapLocation(location: AssetLocationRow[] | AssetLocationRow | null | undefined) {
  if (Array.isArray(location)) {
    return location[0] ?? null
  }

  return location ?? null
}

export default async function AssetsPage() {
  const user = await requireSupabaseUser()

  if (user.role === 'ADMIN') {
    redirect('/dashboard/assets')
  }

  const supabase = createSupabaseServerClient()
  const { data: assetRows } = await supabase
    .from('assets')
    .select(
      'id, asset_tag, category, brand, model, status, warranty_expiry, updated_at, location:locations!assets_location_id_fkey(id, name, building, floor)'
    )
    .eq('assigned_user_id', user.id)
    .order('asset_tag')

  const assets = (assetRows ?? []) as AssetRow[]

  return (
    <AppShell currentPath="/assets" user={user}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">My Assets</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Devices currently assigned to you
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Review the equipment in your care, check where each item currently lives, and request repair when something needs attention.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current Holder</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-full bg-slate-900 p-2 text-white">
                <UserCircle2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
            No devices are currently assigned to your account. If you expected to see something here, contact an admin for reassignment.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {assets.map(asset => {
              const location = formatLocationLabel(unwrapLocation(asset.location), 'No location set')
              const status = asset.status ?? 'IN_STOCK'

              return (
                <article
                  key={asset.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {asset.category ?? 'Asset'}
                      </p>
                      <h2 className="mt-2 font-mono text-2xl font-semibold text-slate-900">
                        {asset.asset_tag ?? asset.id}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {(asset.brand ?? '-')} {(asset.model ?? '').trim()}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {STATUS_LABELS[status]}
                    </span>
                  </div>

                  <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-slate-800">Current Location</dt>
                      <dd className="mt-1 flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span>{location}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-800">Warranty Expiry</dt>
                      <dd className="mt-1">
                        <LocalizedDateTime value={asset.warranty_expiry} />
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-800">Last Activity</dt>
                      <dd className="mt-1">
                        <LocalizedDateTime includeTime showTimeZone value={asset.updated_at} />
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-800">Details</dt>
                      <dd className="mt-1">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                        >
                          <Boxes className="h-4 w-4" />
                          Open Asset
                        </Link>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    {status === 'ASSIGNED' ? (
                      <AssetRepairRequestButton assetId={asset.id} />
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Repair requests are available while the asset is actively assigned to you.
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </AppShell>
  )
}
