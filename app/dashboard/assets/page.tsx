import Link from 'next/link'
import { Boxes, Filter, MapPin, ShieldCheck, UserCircle2 } from 'lucide-react'
import { bulkUpdateAssetStatus, createAsset } from '@/app/actions/assets'
import { AppShell } from '@/app/components/AppShell'
import { AssetSearchInput } from '@/app/components/AssetSearchInput'
import { mapLocationOption, type AssetLocationRow } from '@/lib/locations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AssetLocationOption, AssetRecord, AssetStatus, AssetUserOption } from '@/types/app'
import { AddAssetModal } from './AddAssetModal'
import { AssetTable } from './AssetTable'

const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'In Use',
  IN_REPAIR: 'Under Repair',
  RETIRED: 'Retired',
}

type Props = {
  searchParams?: {
    location?: string | string[]
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
  location: AssetLocationRow[] | AssetLocationRow | null
  location_id: string | null
  model: string | null
  serial_number: string | null
  status: AssetStatus | null
  warranty_expiry: string | null
}

type ProfileRow = {
  email: string | null
  id: string
}

function getProfileLabel(profile: ProfileRow | undefined | null, fallback = 'Unknown user') {
  return profile?.email?.trim() || fallback
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function unwrapLocation(location: AssetLocationRow[] | AssetLocationRow | null | undefined) {
  if (Array.isArray(location)) {
    return location[0] ?? null
  }

  return location ?? null
}

function buildAssetSearchFilter(query: string) {
  const searchTerm = query.replace(/,/g, ' ').trim()

  if (!searchTerm) {
    return ''
  }

  return `asset_tag.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%`
}

export default async function DashboardAssetsPage({ searchParams }: Props) {
  const user = await requireSupabaseAdmin('/assets')
  const supabase = createSupabaseServerClient()
  const q = getSingleValue(searchParams?.q)?.trim() ?? ''
  const status = getSingleValue(searchParams?.status)?.trim() ?? ''
  const type = getSingleValue(searchParams?.type)?.trim() ?? ''
  const location = getSingleValue(searchParams?.location)?.trim() ?? ''
  const openByDefault = getSingleValue(searchParams?.new) === '1'

  let assets: AssetRecord[] = []
  let typeOptions: string[] = []
  let users: AssetUserOption[] = []
  let locationOptions: AssetLocationOption[] = []
  let loadError = ''

  try {
    let assetQuery = supabase
      .from('assets')
      .select(
        'id, asset_tag, category, brand, model, serial_number, status, assigned_user_id, warranty_expiry, location_id, location:locations!assets_location_id_fkey(id, name, building, floor)'
      )
      .order('asset_tag')

    if (status) {
      assetQuery = assetQuery.eq('status', status)
    }

    if (type) {
      assetQuery = assetQuery.eq('category', type)
    }

    if (location) {
      assetQuery = assetQuery.eq('location_id', location)
    }

    if (q) {
      assetQuery = assetQuery.or(buildAssetSearchFilter(q))
    }

    const [
      { data: assetRows, error: assetError },
      { data: typeRows, error: typeError },
      { data: profileRows, error: profileListError },
      { data: locationRows, error: locationError },
    ] = await Promise.all([
      assetQuery,
      supabase.from('assets').select('category').order('category'),
      supabase.from('profiles').select('id, email').not('email', 'is', null).order('email'),
      supabase.from('locations').select('id, name, building, floor').order('name'),
    ])

    if (assetError || typeError || profileListError || locationError) {
      throw assetError ?? typeError ?? profileListError ?? locationError
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
      const locationValue = unwrapLocation(row.location)

      return {
        assetTag: row.asset_tag ?? '',
        assignedUser: assignedUser
          ? {
              email: getProfileLabel(assignedUser, ''),
              id: assignedUser.id,
              name: getProfileLabel(assignedUser),
            }
          : null,
        assignedUserId: row.assigned_user_id,
        brand: row.brand ?? '',
        id: row.id,
        location: locationValue
          ? {
              ...mapLocationOption(locationValue),
            }
          : null,
        locationId: row.location_id,
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

    users = (profileRows ?? []).map((profile: ProfileRow) => ({
      email: getProfileLabel(profile, ''),
      id: profile.id,
      name: getProfileLabel(profile),
    }))

    locationOptions = (locationRows ?? []).map(mapLocationOption)
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
              Review inventory, track where each asset lives, and keep lifecycle controls orderly from one workspace.
            </p>
          </div>

          <div className="print-hide flex flex-wrap items-center gap-3">
            <AddAssetModal action={createAsset} locations={locationOptions} openByDefault={openByDefault} users={users} />
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
              <AssetSearchInput
                defaultValue={q}
                placeholder="Search asset tag, model, serial..."
              />
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
              <label className="relative block w-full sm:w-72">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  name="location"
                  defaultValue={location}
                  className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-900"
                >
                  <option value="">All locations</option>
                  {locationOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Apply Filters
              </button>
              {(q || status || type || location) && (
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
                Admin controls are enabled, including location moves, lifecycle actions, and assignment management.
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
            <AssetTable action={bulkUpdateAssetStatus} assets={assets} isAdmin />
          )}
        </div>
      </section>
    </AppShell>
  )
}
