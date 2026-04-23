import Link from 'next/link'
import { Boxes, Filter, Pencil, Search, ShieldCheck, UserCircle2 } from 'lucide-react'
import { createAsset } from '@/app/actions/assets'
import { AppShell } from '@/app/components/AppShell'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseUser } from '@/lib/supabase/session'
import type { AssetRecord, AssetUserOption } from '@/types/app'
import { AddAssetModal } from './AddAssetModal'

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'Assigned',
  IN_REPAIR: 'In Repair',
  RETIRED: 'Retired',
}

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: 'bg-emerald-100 text-emerald-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_REPAIR: 'bg-amber-100 text-amber-700',
  RETIRED: 'bg-slate-200 text-slate-600',
}

type Props = {
  searchParams?: {
    new?: string | string[]
    q?: string | string[]
    status?: string | string[]
    type?: string | string[]
  }
}

type AssetRow = {
  asset_tag: string | null
  assigned_user_id: string | null
  brand: string | null
  category: string | null
  id: string
  model: string | null
  serial_number: string | null
  status: string | null
  warranty_expiry: string | null
}

type ProfileRow = {
  email: string | null
  id: string
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export default async function DashboardAssetsPage({ searchParams }: Props) {
  const user = await requireSupabaseUser()
  const supabase = createSupabaseServerClient()
  const isAdmin = user.role === 'ADMIN'
  const q = getSingleValue(searchParams?.q)?.trim() ?? ''
  const status = getSingleValue(searchParams?.status)?.trim() ?? ''
  const type = getSingleValue(searchParams?.type)?.trim() ?? ''
  const openByDefault = getSingleValue(searchParams?.new) === '1'

  let assets: AssetRecord[] = []
  let typeOptions: string[] = []
  let users: AssetUserOption[] = []
  let loadError = ''

  try {
    let assetQuery = supabase
      .from('assets')
      .select(
        'id, asset_tag, category, brand, model, serial_number, status, assigned_user_id, warranty_expiry'
      )
      .order('asset_tag')

    if (status) {
      assetQuery = assetQuery.eq('status', status)
    }

    if (type) {
      assetQuery = assetQuery.eq('category', type)
    }

    if (q) {
      const searchTerm = q.replace(/,/g, ' ')
      assetQuery = assetQuery.or(
        `asset_tag.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%`
      )
    }

    const [{ data: assetRows, error: assetError }, { data: typeRows, error: typeError }] =
      await Promise.all([
        assetQuery,
        supabase.from('assets').select('category').order('category'),
      ])

    if (assetError || typeError) {
      throw assetError ?? typeError
    }

    const assignedUserIds = Array.from(
      new Set(
        (assetRows ?? [])
          .map(row => row.assigned_user_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    )

    let profilesById = new Map<string, ProfileRow>()

    if (assignedUserIds.length > 0) {
      const { data: assignedProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', assignedUserIds)

      if (profileError) {
        throw profileError
      }

      profilesById = new Map((assignedProfiles ?? []).map(profile => [profile.id, profile]))
    }

    assets = (assetRows ?? []).map((row: AssetRow) => {
      const assignedUser = row.assigned_user_id ? profilesById.get(row.assigned_user_id) : null

      return {
        assetTag: row.asset_tag ?? '',
        assignedUser: assignedUser
          ? {
              email: assignedUser.email ?? '',
              id: assignedUser.id,
              name: assignedUser.email ?? 'Unassigned',
            }
          : null,
        assignedUserId: row.assigned_user_id,
        brand: row.brand ?? '',
        id: row.id,
        model: row.model ?? '',
        serialNumber: row.serial_number,
        status: row.status ?? 'IN_STOCK',
        type: row.category ?? 'Other',
        warrantyExpiry: row.warranty_expiry,
      }
    })

    typeOptions = Array.from(
      new Set(
        (typeRows ?? [])
          .map(row => row.category)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    )

    if (isAdmin) {
      const { data: profileRows, error: profileListError } = await supabase
        .from('profiles')
        .select('id, email')
        .order('email')

      if (profileListError) {
        throw profileListError
      }

      users = (profileRows ?? []).map((profile: ProfileRow) => ({
        email: profile.email ?? '',
        id: profile.id,
        name: profile.email ?? 'Unknown user',
      }))
    }
  } catch {
    loadError = 'Unable to load assets right now.'
  }

  return (
    <AppShell currentPath="/dashboard/assets" user={user}>
      <section className="print-sheet mx-auto max-w-6xl">
        <div className="print-page-header mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Asset Management
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900">
              <span className="rounded-full border border-slate-200 bg-white p-2 shadow-sm">
                <Boxes className="h-6 w-6 text-slate-700" />
              </span>
              Asset Dashboard
            </h1>
            <p className="print-hide mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Review inventory, print a clean A4 list, and keep asset records orderly from one workspace.
            </p>
          </div>

          <div className="print-hide flex flex-wrap items-center gap-3">
            {isAdmin && (
              <AddAssetModal action={createAsset} openByDefault={openByDefault} users={users} />
            )}
          </div>
        </div>

        <div className="print-single-column mb-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <form
            method="GET"
            className="print-hide rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4" />
              Filter inventory
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="relative block w-full sm:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search tag, brand, model, serial..."
                  className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </label>
              <select
                name="status"
                defaultValue={status}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-900"
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="type"
                defaultValue={type}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-900"
              >
                <option value="">All types</option>
                {typeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Apply Filters
              </button>
              {(q || status || type) && (
                <Link
                  href="/dashboard/assets"
                  className="self-center text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <div className="print-hide rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-900 p-2 text-white">
                <UserCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.email}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Signed in as {user.role}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                Access posture
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isAdmin
                  ? 'Admin controls are enabled, including modal-based asset creation and edit access.'
                  : 'Staff view is read-first. Print remains available while management controls stay disabled.'}
              </p>
            </div>
          </div>
        </div>

        <div className="print-card overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 print:border-b print:px-0 print:py-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Asset List</p>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  {assets.length} asset{assets.length !== 1 ? 's' : ''} in view
                </p>
              </div>
            </div>
          </div>

          {loadError ? (
            <p className="p-6 text-sm text-rose-600">{loadError}</p>
          ) : assets.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No assets matched the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="print-table min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 print:bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Tag</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Brand / Model</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Assigned To</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Warranty</th>
                    <th className="print-hide px-4 py-3 text-left font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="font-mono text-slate-900 hover:underline"
                        >
                          {asset.assetTag}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{asset.type}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {asset.brand} {asset.model}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[asset.status] ?? 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {STATUS_LABELS[asset.status] ?? asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{asset.assignedUser?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(asset.warrantyExpiry)}</td>
                      <td className="print-hide px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/assets/${asset.id}`}
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            View
                          </Link>
                          {isAdmin && (
                            <Link
                              href={`/assets/${asset.id}/edit`}
                              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}
