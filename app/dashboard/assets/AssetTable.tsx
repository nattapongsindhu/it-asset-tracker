'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Download, Pencil } from 'lucide-react'
import type { BulkActionState } from '@/app/actions/assets'
import { LocalizedDateTime } from '@/app/components/LocalizedDateTime'
import { getWarrantyAlert, parseWarrantyDate } from '@/lib/warranty'
import type { AssetLocationOption, AssetRecord, AssetStatus } from '@/types/app'

const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'In Use',
  IN_REPAIR: 'Under Repair',
  RETIRED: 'Retired',
}

const STATUS_COLORS: Record<AssetStatus, string> = {
  IN_STOCK: 'bg-emerald-100 text-emerald-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_REPAIR: 'bg-amber-100 text-amber-700',
  RETIRED: 'bg-slate-200 text-slate-600',
}

const BULK_STATUS_OPTIONS: Array<{ value: Exclude<AssetStatus, 'ASSIGNED'>; label: string }> = [
  { value: 'IN_REPAIR', label: 'Mark Under Repair' },
  { value: 'RETIRED', label: 'Mark Retired' },
  { value: 'IN_STOCK', label: 'Return To Stock' },
]

type Props = {
  action: (state: BulkActionState, formData: FormData) => Promise<BulkActionState>
  assets: AssetRecord[]
  isAdmin: boolean
  locationOptions?: AssetLocationOption[]
  monthlyMaintenanceRows?: Array<{
    actionTaken: string
    assetTag: string
    cost: number | null
    createdAt: string
    createdBy: string
    notes: string | null
    technicianName: string | null
  }>
  monthlyReportLabel?: string
}

type BulkIntent = 'status' | 'location'

function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = parseWarrantyDate(value)

  if (!date) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date)
}

function escapeCsvValue(value: string | null | undefined) {
  const normalized = value ?? ''
  return `"${normalized.replace(/"/g, '""')}"`
}

function buildCsvValue(asset: AssetRecord) {
  return [
    asset.assetTag,
    asset.type,
    asset.brand,
    asset.model,
    asset.serialNumber ?? '',
    STATUS_LABELS[asset.status] ?? asset.status,
    asset.assignedUser?.name ?? 'Unassigned',
    asset.location?.label ?? 'No location set',
    asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : '',
  ]
    .map(escapeCsvValue)
    .join(',')
}

function WarrantyCell({ value }: { value: AssetRecord['warrantyExpiry'] }) {
  const alert = getWarrantyAlert(value)

  if (!value) {
    return (
      <span className="text-slate-500">No warranty date</span>
    )
  }

  const badge =
    alert.level === 'expired' ? (
      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        Expired
      </span>
    ) : alert.level === 'warning' ? (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        30-day alert
      </span>
    ) : null

  return (
    <div className="flex flex-col gap-1">
      <LocalizedDateTime
        fallback={formatDate(value)}
        showTimeRemaining={alert.isCritical}
        value={value}
      />
      {badge}
    </div>
  )
}

export function AssetTable({
  action,
  assets,
  isAdmin,
  locationOptions,
  monthlyMaintenanceRows,
  monthlyReportLabel,
}: Props) {
  const [state, formAction] = useFormState(action, undefined)
  const [bulkIntent, setBulkIntent] = useState<BulkIntent>('status')
  const [bulkLocationId, setBulkLocationId] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<Exclude<AssetStatus, 'ASSIGNED'>>('IN_REPAIR')

  useEffect(() => {
    if (state?.message) {
      setSelectedIds([])
    }
  }, [state?.message])

  const allSelected = assets.length > 0 && selectedIds.length === assets.length

  function toggleAsset(assetId: string) {
    setSelectedIds(current =>
      current.includes(assetId) ? current.filter(id => id !== assetId) : [...current, assetId]
    )
  }

  function toggleAll() {
    setSelectedIds(current => (current.length === assets.length ? [] : assets.map(asset => asset.id)))
  }

  function exportToCsv() {
    const header = [
      'Asset Tag',
      'Type',
      'Brand',
      'Model',
      'Serial Number',
      'Status',
      'Assigned To',
      'Current Location',
      'Warranty Expiry',
    ]
      .map(escapeCsvValue)
      .join(',')
    const rows = assets.map(buildCsvValue)
    const csvContent = ['\uFEFF' + header, ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStamp = new Date().toISOString().slice(0, 10)

    link.href = downloadUrl
    link.download = `it-assets-${dateStamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
  }

  function exportMonthlyMaintenanceReport() {
    const header = [
      'Asset Tag',
      'Action Taken',
      'Technician Name',
      'Cost',
      'Logged At',
      'Logged By',
      'Notes',
    ]
      .map(escapeCsvValue)
      .join(',')
    const rows = (monthlyMaintenanceRows ?? []).map(row =>
      [
        row.assetTag,
        row.actionTaken,
        row.technicianName ?? '',
        row.cost?.toFixed(2) ?? '',
        row.createdAt,
        row.createdBy,
        row.notes ?? '',
      ]
        .map(escapeCsvValue)
        .join(',')
    )
    const csvContent = ['\uFEFF' + header, ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const reportSlug = (monthlyReportLabel ?? 'maintenance-report').toLowerCase().replace(/\s+/g, '-')

    link.href = downloadUrl
    link.download = `${reportSlug}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
  }

  return (
    <form action={formAction}>
      <div className="print-hide border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {isAdmin ? 'Bulk Actions And Export' : 'Export Current View'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? 'Download the filtered asset list as CSV, or update multiple assets while keeping assignment data consistent.'
                : 'Download the currently filtered asset list as CSV for accounting or handoff work.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={exportToCsv}
              className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export To CSV
              </span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={exportMonthlyMaintenanceReport}
                disabled={!monthlyMaintenanceRows || monthlyMaintenanceRows.length === 0}
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Monthly Maintenance Report
              </button>
            )}
            {isAdmin && (
              <>
                <input type="hidden" name="intent" value={bulkIntent} />
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Select all in view
                </label>
                <select
                  value={bulkIntent}
                  onChange={e => setBulkIntent(e.target.value as BulkIntent)}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-900"
                >
                  <option value="status">Bulk Change Status</option>
                  <option value="location">Bulk Move Location</option>
                </select>
                {bulkIntent === 'status' ? (
                  <select
                    name="status"
                    value={bulkStatus}
                    onChange={e => setBulkStatus(e.target.value as Exclude<AssetStatus, 'ASSIGNED'>)}
                    className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-900"
                  >
                    {BULK_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    name="locationId"
                    value={bulkLocationId}
                    onChange={e => setBulkLocationId(e.target.value)}
                    className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-900"
                  >
                    <option value="">Select destination</option>
                    {(locationOptions ?? []).map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                {selectedIds.map(id => (
                  <input key={id} type="hidden" name="assetIds" value={id} />
                ))}
                <BulkActionSubmitButton disabled={selectedIds.length === 0} />
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {assets.length} rows in export
          </span>
          {isAdmin && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {selectedIds.length} selected
            </span>
          )}
          {isAdmin && monthlyMaintenanceRows && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {monthlyMaintenanceRows.length} repair entries in {monthlyReportLabel ?? 'report'}
            </span>
          )}
          {state?.message && <span className="text-emerald-700">{state.message}</span>}
          {state?.error && <span className="text-rose-600">{state.error}</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="print-table min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 print:bg-white">
            <tr>
              {isAdmin && (
                <th className="print-hide w-14 px-4 py-3 text-left font-medium text-slate-600">
                  Pick
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tag</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Brand / Model</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Assigned To</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Location</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Warranty</th>
              <th className="print-hide px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map(asset => (
              <tr key={asset.id} className="hover:bg-slate-50">
                {isAdmin && (
                  <td className="print-hide px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      aria-label={`Select ${asset.assetTag}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link href={`/assets/${asset.id}`} className="font-mono text-slate-900 hover:underline">
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
                <td className="px-4 py-3 text-slate-600">{asset.assignedUser?.name ?? 'Unassigned'}</td>
                <td className="px-4 py-3 text-slate-600">{asset.location?.label ?? 'No location set'}</td>
                <td className="px-4 py-3 text-slate-600">
                  <WarrantyCell value={asset.warrantyExpiry} />
                </td>
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
    </form>
  )
}

function BulkActionSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Applying...' : 'Apply Bulk Action'}
    </button>
  )
}
