import Link from 'next/link'
import {
  Archive,
  Boxes,
  Mail,
  Search,
  ShieldCheck,
  UserCircle2,
  Wrench,
} from 'lucide-react'
import { AppShell } from '@/app/components/AppShell'
import { AssetSearchInput } from '@/app/components/AssetSearchInput'
import { CategoryAnalytics } from '@/app/dashboard/CategoryAnalytics'
import { WarrantySummaryCard } from '@/app/dashboard/WarrantySummaryCard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'

type AssetStatus = 'IN_STOCK' | 'ASSIGNED' | 'IN_REPAIR' | 'RETIRED'

type AssetSummaryRow = {
  asset_tag: string | null
  category: string | null
  id: string
  status: string | null
  updated_at: string | null
}
type AssetBreakdownRow = {
  category: string | null
  status: string | null
  warranty_expiry: string | null
}
type CategoryShare = {
  color: string
  count: number
  href: string
  label: string
  percentage: number
}
const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'In Use',
  IN_REPAIR: 'Under Repair',
  RETIRED: 'Retired',
}

const STATUS_META: Array<{
  icon: typeof Boxes
  label: string
  status?: AssetStatus
}> = [
  { icon: Boxes, label: 'Total Assets' },
  { icon: Archive, label: 'In Stock', status: 'IN_STOCK' },
  { icon: UserCircle2, label: 'In Use', status: 'ASSIGNED' },
  { icon: Wrench, label: 'Under Repair', status: 'IN_REPAIR' },
  { icon: ShieldCheck, label: 'Retired', status: 'RETIRED' },
]
const CATEGORY_COLORS = ['#0f766e', '#2563eb', '#d97706', '#e11d48', '#0f172a', '#059669'] as const

type Props = {
  searchParams?: {
    q?: string | string[]
  }
}

function formatRelativeDate(value: string | null) {
  if (!value) {
    return 'No updates yet'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildAssetSearchFilter(query: string) {
  const searchTerm = query.replace(/,/g, ' ').trim()

  if (!searchTerm) {
    return ''
  }

  return `asset_tag.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%`
}

function buildCategoryShares(rows: AssetBreakdownRow[], searchQuery = ''): CategoryShare[] {
  const totals = new Map<string, number>()

  rows.forEach(row => {
    const label = row.category?.trim() || 'Other'
    totals.set(label, (totals.get(label) ?? 0) + 1)
  })

  const orderedCategories = Array.from(totals.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))

  const total = orderedCategories.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return []
  }

  const visibleCategories = orderedCategories.slice(0, 5)
  const remainingCount = orderedCategories.slice(5).reduce((sum, item) => sum + item.count, 0)

  if (remainingCount > 0) {
    visibleCategories.push({ label: 'Other', count: remainingCount })
  }

  const querySuffix = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''

  return visibleCategories.map((item, index) => ({
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    count: item.count,
    href:
      item.label === 'Other'
        ? `/dashboard/assets?type=Other${querySuffix}`
        : `/dashboard/assets?type=${encodeURIComponent(item.label)}${querySuffix}`,
    label: item.label,
    percentage: Number(((item.count / total) * 100).toFixed(1)),
  }))
}

export default async function DashboardPage({ searchParams }: Props) {
  const user = await requireSupabaseAdmin('/assets')
  const supabase = createSupabaseServerClient()
  const q = getSingleValue(searchParams?.q)?.trim() ?? ''

  let recentAssets: AssetSummaryRow[] = []
  let assetBreakdownRows: AssetBreakdownRow[] = []

  try {
    let recentAssetsQuery = supabase
      .from('assets')
      .select('id, asset_tag, category, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(6)
    let breakdownQuery = supabase.from('assets').select('status, category, warranty_expiry')

    if (q) {
      const searchFilter = buildAssetSearchFilter(q)
      recentAssetsQuery = recentAssetsQuery.or(searchFilter)
      breakdownQuery = breakdownQuery.or(searchFilter)
    }

    const [
      { data: recentAssetRows, error: recentAssetsError },
      { data: breakdownRows, error: breakdownError },
    ] = await Promise.all([
      recentAssetsQuery,
      breakdownQuery,
    ])

    if (recentAssetsError || breakdownError) {
      throw recentAssetsError ?? breakdownError
    }

    recentAssets = recentAssetRows ?? []
    assetBreakdownRows = (breakdownRows ?? []).map(row => ({
      category: row.category,
      status: row.status,
      warranty_expiry: row.warranty_expiry,
    }))
  } catch {
    recentAssets = []
    assetBreakdownRows = []
  }

  const assetStatuses = assetBreakdownRows
    .map(row => row.status)
    .filter((status): status is string => typeof status === 'string')
  const categoryShares = buildCategoryShares(assetBreakdownRows, q)
  const totalAssets = assetStatuses.length
  const assignedRatio =
    totalAssets === 0 ? 0 : Math.round((statsCount(assetStatuses, 'ASSIGNED') / totalAssets) * 100)
  const searchSuffix = q ? `&q=${encodeURIComponent(q)}` : ''
  const baseInventoryHref = q ? `/dashboard/assets?q=${encodeURIComponent(q)}` : '/dashboard/assets'

  const stats = STATUS_META.map(item => ({
    href: item.status ? `/dashboard/assets?status=${item.status}${searchSuffix}` : baseInventoryHref,
    icon: item.icon,
    label: item.label,
    value: item.status
      ? assetStatuses.filter(status => status === item.status).length
      : assetStatuses.length,
  }))

  return (
    <AppShell currentPath="/dashboard" user={user}>
      <section className="print-sheet mx-auto max-w-6xl">
        <div className="print-page-header mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back, {user.name}
            </h1>
            <p className="print-hide mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              This portfolio-lite dashboard keeps the workspace tidy: recent assets, clean counts,
              and a clear profile snapshot for the signed-in user.
            </p>
          </div>

          <div className="print-hide flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/assets?new=1"
              className="print-hide rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Add Asset
            </Link>
          </div>
        </div>

        <section className="print-hide rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Search className="h-4 w-4" />
            Global inventory search
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AssetSearchInput
              defaultValue={q}
              placeholder="Search asset tag, model, serial..."
            />
            <Link
              href={q ? '/dashboard' : '/dashboard/assets'}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              {q ? 'Clear search' : 'Open advanced filters'}
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Real-time search updates this dashboard from asset tag, model, and serial number using case-insensitive matching.
          </p>
        </section>

        <div className="print-hide mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map(stat => {
            const Icon = stat.icon

            return (
              <div
                key={stat.label}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {stat.label}
                  </p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 p-2">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </span>
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
                  {stat.value}
                </p>
                <div className="print-hide mt-5 flex items-center justify-between gap-3">
                  <Link
                    href={stat.href}
                    className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  >
                    Open
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          <WarrantySummaryCard
            searchQuery={q}
            warrantyDates={assetBreakdownRows.map(row => row.warranty_expiry)}
          />
        </div>

        <div className="print-single-column mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="print-hide rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Analytics
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Asset mix by category</h2>
                </div>
                <Link
                  href={baseInventoryHref}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Open full inventory
                </Link>
              </div>

              {categoryShares.length === 0 ? (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  Add asset records to unlock category analytics.
                </div>
              ) : (
                <CategoryAnalytics
                  assignedRatio={assignedRatio}
                  shares={categoryShares}
                  totalAssets={totalAssets}
                />
              )}
            </section>

            <section className="print-card rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Recent Assets
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Latest inventory updates</h2>
                </div>
                <Link
                  href={baseInventoryHref}
                  className="print-hide rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Open asset list
                </Link>
              </div>

              {recentAssets.length === 0 ? (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No assets are available yet. Add the first record from the asset dashboard when you are ready.
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="print-table min-w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Tag</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Updated</th>
                        <th className="print-hide px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentAssets.map(asset => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-900">{asset.asset_tag ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{asset.category ?? 'Other'}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {asset.status && asset.status in STATUS_LABELS
                              ? STATUS_LABELS[asset.status as AssetStatus]
                              : asset.status ?? 'UNKNOWN'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatRelativeDate(asset.updated_at)}</td>
                          <td className="print-hide px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/assets/${asset.id}`}
                                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="print-hide rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Current User Profile
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Signed-in account</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-900 p-2 text-white">
                    <UserCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {user.role}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Mail className="h-4 w-4 text-slate-500" />
                  Email
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{user.email}</p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  Role access
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Admin access is active, so the asset dashboard can open create and edit controls.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  )
}

function statsCount(assetStatuses: string[], targetStatus: AssetStatus) {
  return assetStatuses.filter(status => status === targetStatus).length
}
