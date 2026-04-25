'use client'

import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateAssetLocation, type LocationActionState } from '@/app/actions/assets'
import type { AssetLocationOption } from '@/types/app'

type Props = {
  assetId: string
  currentLocationId: string | null
  currentLocationLabel: string
  locations: AssetLocationOption[]
}

export function AssetLocationPanel({
  assetId,
  currentLocationId,
  currentLocationLabel,
  locations,
}: Props) {
  const router = useRouter()
  const [state, formAction] = useFormState<LocationActionState, FormData>(
    updateAssetLocation.bind(null, assetId),
    undefined
  )

  useEffect(() => {
    if (state?.message) {
      router.refresh()
    }
  }, [router, state?.message])

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Movement</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Location tracking</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Move this asset between departments, buildings, or handoff points while keeping an audit trail.
        </p>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MapPin className="h-4 w-4 text-slate-500" />
          Current location
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{currentLocationLabel}</p>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Move To</label>
          <select
            name="locationId"
            defaultValue={currentLocationId ?? ''}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">No location set</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </div>

        {state?.error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Save Location
        </button>
      </form>
    </section>
  )
}
