'use client'
import { useFormState } from 'react-dom'
import type { Asset, User } from '@prisma/client'

const STATUSES = [
  { value: 'IN_STOCK',  label: 'In Stock' },
  { value: 'ASSIGNED',  label: 'Assigned' },
  { value: 'IN_REPAIR', label: 'In Repair' },
  { value: 'RETIRED',   label: 'Retired' },
]

const TYPES = ['Laptop', 'Desktop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Phone', 'Tablet', 'Other']

type ActionState = { error?: string } | undefined

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  asset?: Asset
  users: Pick<User, 'id' | 'name' | 'email'>[]
}

export function AssetForm({ action, asset, users }: Props) {
  const [state, formAction] = useFormState(action, undefined)

  const warrantyValue = asset?.warrantyExpiry
    ? new Date(asset.warrantyExpiry).toISOString().slice(0, 10)
    : ''

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-5">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{state.error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Asset Tag *" name="assetTag" defaultValue={asset?.assetTag} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            name="type"
            defaultValue={asset?.type ?? ''}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select type</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Field label="Brand *"  name="brand"  defaultValue={asset?.brand}  required />
        <Field label="Model *"  name="model"  defaultValue={asset?.model}  required />
        <Field label="Serial Number" name="serialNumber" defaultValue={asset?.serialNumber ?? ''} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select
            name="status"
            defaultValue={asset?.status ?? 'IN_STOCK'}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
          <select
            name="assignedUserId"
            defaultValue={asset?.assignedUserId ?? ''}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
          <input
            type="date"
            name="warrantyExpiry"
            defaultValue={warrantyValue}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm px-5 py-2 rounded hover:bg-blue-700"
        >
          Save
        </button>
        <a href="/assets" className="text-sm text-gray-500 self-center hover:text-gray-800">Cancel</a>
      </div>
    </form>
  )
}

function Field({ label, name, defaultValue, required }: {
  label: string; name: string; defaultValue?: string | null; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
