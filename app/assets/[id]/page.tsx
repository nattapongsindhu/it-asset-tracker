import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { AppShell } from '@/app/components/AppShell'
import { AssetRepairRequestButton } from '@/app/components/AssetRepairRequestButton'
import { LocalizedDateTime } from '@/app/components/LocalizedDateTime'
import { formatLocationLabel, mapLocationOption, type AssetLocationRow } from '@/lib/locations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseUser } from '@/lib/supabase/session'
import type {
  AssetAssignmentRecord,
  AssetLocationOption,
  AssetStatus,
  AssetUserOption,
  MaintenanceLogRecord,
} from '@/types/app'
import { AssetAssignmentPanel } from './AssetAssignmentPanel'
import { AssetLifecyclePanel } from './AssetLifecyclePanel'
import { AssetLocationPanel } from './AssetLocationPanel'
import { DeleteAssetButton } from './DeleteAssetButton'
import { RepairHistoryPanel } from './RepairHistoryPanel'

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'In Use',
  IN_REPAIR: 'Under Repair',
  RETIRED: 'Retired',
}

type Props = { params: { id: string } }

type DetailRow = {
  label: string
  value: ReactNode
}

type ProfileLookupRow = {
  email: string | null
  id: string
}

type AssignmentHistoryRow = {
  assigned_at: string
  asset_id: string | null
  asset_tag_snapshot: string | null
  assigned_by_profile: ProfileLookupRow[] | ProfileLookupRow | null
  id: string
  note: string | null
  returned_at: string | null
  returned_by_profile: ProfileLookupRow[] | ProfileLookupRow | null
  status: string | null
  user: ProfileLookupRow[] | ProfileLookupRow | null
}

type AssetDetail = {
  asset_tag: string | null
  assigned_user_id: string | null
  brand: string | null
  category: string | null
  created_at: string | null
  id: string
  location: AssetLocationRow[] | AssetLocationRow | null
  location_id: string | null
  model: string | null
  notes: string | null
  serial_number: string | null
  status: AssetStatus | null
  updated_at: string | null
  warranty_expiry: string | null
}

type MaintenanceHistoryRow = {
  action_taken: string | null
  asset_id: string | null
  asset_tag_snapshot: string | null
  cost: number | string | null
  created_at: string
  created_by_profile: ProfileLookupRow[] | ProfileLookupRow | null
  id: string
  notes: string | null
  technician_name: string | null
}

function formatValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : '-'
}

function unwrapProfile(profile: ProfileLookupRow[] | ProfileLookupRow | null | undefined) {
  if (Array.isArray(profile)) {
    return profile[0] ?? null
  }

  return profile ?? null
}

function unwrapLocation(location: AssetLocationRow[] | AssetLocationRow | null | undefined) {
  if (Array.isArray(location)) {
    return location[0] ?? null
  }

  return location ?? null
}

function getProfileLabel(
  profile: ProfileLookupRow[] | ProfileLookupRow | null | undefined,
  fallback = 'Unknown user'
) {
  return unwrapProfile(profile)?.email?.trim() || fallback
}

function mapProfile(profile: ProfileLookupRow[] | ProfileLookupRow | null | undefined): AssetUserOption | null {
  const value = unwrapProfile(profile)

  if (!value?.id || !value.email?.trim()) {
    return null
  }

  return {
    email: value.email.trim(),
    id: value.id,
    name: value.email.trim(),
  }
}

function buildDetailRows(
  asset: AssetDetail,
  assignedUserName: string,
  currentLocationLabel: string,
  lastMaintenanceValue: ReactNode
): DetailRow[] {
  return [
    { label: 'Asset Tag', value: formatValue(asset.asset_tag) },
    { label: 'Type', value: formatValue(asset.category) },
    { label: 'Brand', value: formatValue(asset.brand) },
    { label: 'Model', value: formatValue(asset.model) },
    { label: 'Serial Number', value: formatValue(asset.serial_number) },
    { label: 'Status', value: STATUS_LABELS[asset.status ?? ''] ?? asset.status ?? '-' },
    { label: 'Assigned To', value: assignedUserName },
    { label: 'Current Location', value: currentLocationLabel },
    {
      label: 'Warranty Expiry',
      value: <LocalizedDateTime value={asset.warranty_expiry} />,
    },
    {
      label: 'Last Maintenance',
      value: lastMaintenanceValue,
    },
    {
      label: 'Created',
      value: <LocalizedDateTime includeTime showTimeZone value={asset.created_at} />,
    },
    {
      label: 'Last Updated',
      value: <LocalizedDateTime includeTime showTimeZone value={asset.updated_at} />,
    },
    { label: 'Notes', value: formatValue(asset.notes) },
  ]
}

function mapAssignableUsers(profileRows: ProfileLookupRow[]) {
  return profileRows.map(profile => ({
    email: getProfileLabel(profile, ''),
    id: profile.id,
    name: getProfileLabel(profile),
  }))
}

function mapAssignmentHistory(historyRows: unknown[]): AssetAssignmentRecord[] {
  return historyRows.map(rawRow => {
    const row = rawRow as AssignmentHistoryRow

    return {
      assetId: row.asset_id,
      assetTagSnapshot: row.asset_tag_snapshot,
      assignedAt: row.assigned_at,
      assignedBy: mapProfile(row.assigned_by_profile),
      id: row.id,
      note: row.note,
      returnedAt: row.returned_at,
      returnedBy: mapProfile(row.returned_by_profile),
      status: row.status === 'RETURNED' ? 'RETURNED' : 'ASSIGNED',
      user: mapProfile(row.user),
    }
  })
}

function mapMaintenanceHistory(historyRows: unknown[]): MaintenanceLogRecord[] {
  return historyRows.map(rawRow => {
    const row = rawRow as MaintenanceHistoryRow
    const parsedCost =
      typeof row.cost === 'number'
        ? row.cost
        : typeof row.cost === 'string' && row.cost.trim().length > 0
          ? Number(row.cost)
          : null

    return {
      actionTaken: row.action_taken ?? 'Maintenance update',
      assetId: row.asset_id,
      assetTagSnapshot: row.asset_tag_snapshot,
      cost: parsedCost !== null && Number.isFinite(parsedCost) ? parsedCost : null,
      createdAt: row.created_at,
      createdBy: mapProfile(row.created_by_profile),
      id: row.id,
      notes: row.notes,
      technicianName: row.technician_name,
    }
  })
}

function getHistoryStatusLabel(status: AssetAssignmentRecord['status']) {
  return status === 'ASSIGNED' ? 'In Use' : 'Returned'
}

function getHistoryStatusCopy(status: AssetAssignmentRecord['status']) {
  return status === 'ASSIGNED' ? 'Active assignment' : 'Returned record'
}

function getAssignmentSummary(assignedUserId: string | null, assignedUserName: string) {
  return assignedUserId
    ? `Currently assigned to ${assignedUserName}. This asset is in the In Use workflow.`
    : 'Currently unassigned and ready to return to stock workflows.'
}

export default async function AssetDetailPage({ params }: Props) {
  const user = await requireSupabaseUser()
  const isAdmin = user.role === 'ADMIN'
  const supabase = createSupabaseServerClient()

  const { data: asset } = await supabase
    .from('assets')
    .select(
      'id, asset_tag, category, brand, model, serial_number, status, assigned_user_id, location_id, location:locations!assets_location_id_fkey(id, name, building, floor), warranty_expiry, notes, created_at, updated_at'
    )
    .eq('id', params.id)
    .maybeSingle()

  if (!asset) {
    notFound()
  }

  if (!isAdmin && asset.assigned_user_id !== user.id) {
    notFound()
  }

  let assignedUserName = 'Unassigned'

  if (asset.assigned_user_id) {
    const { data: assignedUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', asset.assigned_user_id)
      .maybeSingle()

    assignedUserName = getProfileLabel(assignedUser, 'Unknown user')
  }

  let users: AssetUserOption[] = []
  let assignmentHistory: AssetAssignmentRecord[] = []
  let assignmentHistoryReady = false
  let locations: AssetLocationOption[] = []
  let maintenanceHistory: MaintenanceLogRecord[] = []
  let maintenanceHistoryReady = false

  const { data: maintenanceRows, error: maintenanceError } = await supabase
    .from('maintenance_logs')
    .select(
      'id, asset_id, asset_tag_snapshot, action_taken, technician_name, cost, notes, created_at, created_by_profile:profiles!maintenance_logs_created_by_fkey(id, email)'
    )
    .eq('asset_id', params.id)
    .order('created_at', { ascending: false })

  if (!maintenanceError) {
    maintenanceHistoryReady = true
    maintenanceHistory = mapMaintenanceHistory((maintenanceRows ?? []) as unknown[])
  }

  if (isAdmin) {
    const [
      { data: profileRows, error: profilesError },
      { data: historyRows, error: historyError },
      { data: locationRows, error: locationsError },
    ] = await Promise.all([
      supabase.from('profiles').select('id, email').not('email', 'is', null).order('email'),
      supabase
        .from('asset_assignments')
        .select(
          'id, asset_id, asset_tag_snapshot, status, assigned_at, returned_at, note, user:profiles!asset_assignments_user_id_fkey(id, email), assigned_by_profile:profiles!asset_assignments_assigned_by_fkey(id, email), returned_by_profile:profiles!asset_assignments_returned_by_fkey(id, email)'
        )
        .eq('asset_id', params.id)
        .order('assigned_at', { ascending: false }),
      supabase.from('locations').select('id, name, building, floor').order('name'),
    ])

    if (!profilesError) {
      users = mapAssignableUsers(profileRows ?? [])
    }

    if (!historyError) {
      assignmentHistoryReady = true
      assignmentHistory = mapAssignmentHistory((historyRows ?? []) as unknown[])
    }

    if (!locationsError) {
      locations = (locationRows ?? []).map(mapLocationOption)
    }
  }

  const currentLocation = unwrapLocation(asset.location)
  const currentLocationLabel = formatLocationLabel(currentLocation, 'No location set')
  const assignmentSummary = getAssignmentSummary(asset.assigned_user_id, assignedUserName)
  const latestMaintenanceEntry = maintenanceHistory[0]
  const lastMaintenanceValue = latestMaintenanceEntry ? (
    <span>
      {latestMaintenanceEntry.actionTaken} on{' '}
      <LocalizedDateTime includeTime showTimeZone value={latestMaintenanceEntry.createdAt} />
    </span>
  ) : (
    'No maintenance logged yet'
  )
  const rows = buildDetailRows(
    asset as AssetDetail,
    assignedUserName,
    currentLocationLabel,
    lastMaintenanceValue
  )
  const currentPath = isAdmin ? '/dashboard/assets' : '/assets'
  const backHref = isAdmin ? '/dashboard/assets' : '/assets'

  return (
    <AppShell currentPath={currentPath} user={user}>
      <section className="print-sheet mx-auto max-w-6xl">
        <div className="print-page-header mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href={backHref}
              className="print-hide text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              {isAdmin ? 'Back to assets' : 'Back to my assets'}
            </Link>
            <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-slate-900">
              {asset.asset_tag ?? params.id}
            </h1>
            <p className="print-hide mt-3 text-sm leading-7 text-slate-600">
              Review the current asset record, operational workflow, and browser-local timestamps in one compact detail view.
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

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="print-card overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Assignment
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{assignmentSummary}</p>
              </div>
              {rows.map(row => (
                <div
                  key={row.label}
                  className="print-detail-row flex flex-col gap-2 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:flex-row"
                >
                  <span className="print-detail-label w-44 shrink-0 text-sm font-medium text-slate-500">
                    {row.label}
                  </span>
                  <span className="print-detail-value text-sm leading-7 text-slate-800">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {isAdmin && (
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Assignment History
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Check-in / Check-out log</h2>
                </div>

                {!assignmentHistoryReady ? (
                  <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                    Assignment history will appear here after the Phase 2 migration is applied in Supabase.
                  </div>
                ) : assignmentHistory.length === 0 ? (
                  <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                    No assignment history has been recorded for this asset yet.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {assignmentHistory.map(entry => (
                      <div
                        key={entry.id}
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {entry.user?.email ?? 'Unknown user'}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {getHistoryStatusCopy(entry.status)}
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {getHistoryStatusLabel(entry.status)}
                          </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          <div>
                            <dt className="font-medium text-slate-800">Assigned At</dt>
                            <dd className="mt-1">
                              <LocalizedDateTime includeTime showTimeZone value={entry.assignedAt} />
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-slate-800">Returned At</dt>
                            <dd className="mt-1">
                              <LocalizedDateTime includeTime showTimeZone value={entry.returnedAt} />
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-slate-800">Assigned By</dt>
                            <dd className="mt-1">{entry.assignedBy?.email ?? '-'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-slate-800">Returned By</dt>
                            <dd className="mt-1">{entry.returnedBy?.email ?? '-'}</dd>
                          </div>
                        </dl>

                        {entry.note && (
                          <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <RepairHistoryPanel entries={maintenanceHistory} ready={maintenanceHistoryReady} />
          </div>

          <div className="print-hide space-y-6">
            {isAdmin ? (
              <>
                <AssetAssignmentPanel
                  assetId={asset.id}
                  currentAssignedUserId={asset.assigned_user_id}
                  currentAssignedUserLabel={assignedUserName}
                  currentStatus={asset.status ?? 'IN_STOCK'}
                  users={users}
                />
                <AssetLocationPanel
                  assetId={asset.id}
                  currentLocationId={asset.location_id}
                  currentLocationLabel={currentLocationLabel}
                  locations={locations}
                />
                <AssetLifecyclePanel assetId={asset.id} currentStatus={asset.status ?? 'IN_STOCK'} />
              </>
            ) : (
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Support</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Need repair help?</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Send a lightweight repair request to the admin team without changing the asset lifecycle yourself.
                  </p>
                </div>

                <div className="mt-6">
                  {asset.status === 'ASSIGNED' ? (
                    <AssetRepairRequestButton assetId={asset.id} />
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Repair requests are available while this asset is actively assigned to you.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
