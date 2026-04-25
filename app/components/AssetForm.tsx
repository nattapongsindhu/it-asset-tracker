'use client'
import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Save } from 'lucide-react'
import type { AssetLocationOption, AssetRecord, AssetStatus, AssetUserOption } from '@/types/app'

const STATUS_OPTIONS: Array<{ value: AssetStatus; label: string }> = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'ASSIGNED', label: 'In Use' },
  { value: 'IN_REPAIR', label: 'Under Repair' },
  { value: 'RETIRED', label: 'Retired' },
]

const MANUAL_STATUS_OPTIONS = STATUS_OPTIONS.filter(status => status.value !== 'ASSIGNED')

const TYPES = ['Laptop', 'Desktop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Phone', 'Tablet', 'Other']

type ActionState = { error?: string } | undefined

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  asset?: AssetRecord
  cancelHref?: string
  locations: AssetLocationOption[]
  submitLabel?: string
  users: AssetUserOption[]
}

export function AssetForm({
  action,
  asset,
  cancelHref = '/dashboard/assets',
  locations,
  submitLabel = 'Save Asset',
  users,
}: Props) {
  const [state, formAction] = useFormState(action, undefined)
  const [assignedUserId, setAssignedUserId] = useState(asset?.assignedUserId ?? '')
  const [manualStatus, setManualStatus] = useState<AssetStatus>(
    asset?.status === 'IN_REPAIR' || asset?.status === 'RETIRED' ? asset.status : 'IN_STOCK'
  )

  const warrantyValue = asset?.warrantyExpiry
    ? new Date(asset.warrantyExpiry).toISOString().slice(0, 10)
    : ''
  const hadInitialAssignment = Boolean(asset?.assignedUserId)
  const isAssigned = assignedUserId.trim().length > 0
  const isReturningToStock = hadInitialAssignment && !isAssigned
  const effectiveStatus: AssetStatus = isAssigned ? 'ASSIGNED' : isReturningToStock ? 'IN_STOCK' : manualStatus
  const autoManagedStatus = isAssigned || isReturningToStock
  const statusOptions = autoManagedStatus ? STATUS_OPTIONS : MANUAL_STATUS_OPTIONS

  return (
    <form action={formAction} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Asset Tag *" name="assetTag" defaultValue={asset?.assetTag} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            name="type"
            defaultValue={asset?.type ?? ''}
            required
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Select type</option>
            {TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <Field label="Brand *" name="brand" defaultValue={asset?.brand} required />
        <Field label="Model *" name="model" defaultValue={asset?.model} required />
        <Field label="Serial Number" name="serialNumber" defaultValue={asset?.serialNumber ?? ''} />
        <input type="hidden" name="status" value={effectiveStatus} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select
            value={autoManagedStatus ? effectiveStatus : manualStatus}
            onChange={e => setManualStatus(e.target.value as AssetStatus)}
            disabled={autoManagedStatus}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {isAssigned
              ? 'Selecting an employee saves this asset as Assigned automatically.'
              : isReturningToStock
                ? 'Clearing the assignee returns this asset to In Stock on save.'
                : 'Use status for stock, repair, or retirement when the asset is not assigned.'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
          <select
            name="assignedUserId"
            value={assignedUserId}
            onChange={e => setAssignedUserId(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Choose a real employee from the profiles directory. Removing the assignee is treated as
            returning the asset.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
          <select
            name="locationId"
            defaultValue={asset?.locationId ?? ''}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">No location set</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Track which building, floor, or handoff point currently holds this asset.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
          <input
            type="date"
            name="warrantyExpiry"
            defaultValue={warrantyValue}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          defaultValue={asset?.notes ?? ''}
          rows={3}
          maxLength={2000}
          className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-y"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <span className="inline-flex items-center gap-2">
            <Save className="h-4 w-4" />
            {submitLabel}
          </span>
        </button>
        <a href={cancelHref} className="self-center text-sm text-slate-500 hover:text-slate-800">Cancel</a>
      </div>
    </form>
  )
}

function Field({ label, name, defaultValue, required }: {
  label: string
  name: string
  defaultValue?: string | null
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
      />
    </div>
  )
}
