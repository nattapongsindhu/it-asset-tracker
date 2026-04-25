'use client'

import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { Archive, RotateCcw, Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  completeAssetRepair,
  decommissionAsset,
  sendAssetToRepair,
  type LifecycleActionState,
} from '@/app/actions/assets'
import type { AssetStatus } from '@/types/app'

type Props = {
  assetId: string
  currentStatus: AssetStatus
}

function getStatusLabel(status: AssetStatus) {
  switch (status) {
    case 'ASSIGNED':
      return 'In Use'
    case 'IN_REPAIR':
      return 'Under Repair'
    case 'RETIRED':
      return 'Retired'
    default:
      return 'In Stock'
  }
}

export function AssetLifecyclePanel({ assetId, currentStatus }: Props) {
  const router = useRouter()
  const [repairState, repairFormAction] = useFormState<LifecycleActionState, FormData>(
    sendAssetToRepair.bind(null, assetId),
    undefined
  )
  const [completeState, completeFormAction] = useFormState<LifecycleActionState, FormData>(
    completeAssetRepair.bind(null, assetId),
    undefined
  )
  const [decommissionState, decommissionFormAction] = useFormState<LifecycleActionState, FormData>(
    decommissionAsset.bind(null, assetId),
    undefined
  )

  useEffect(() => {
    if (repairState?.message || completeState?.message || decommissionState?.message) {
      router.refresh()
    }
  }, [completeState?.message, decommissionState?.message, repairState?.message, router])

  const isRetired = currentStatus === 'RETIRED'
  const isRepair = currentStatus === 'IN_REPAIR'

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lifecycle</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Repair and decommission</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Move assets through the operational lifecycle without losing audit history.
        </p>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Current lifecycle state</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{getStatusLabel(currentStatus)}</p>
      </div>

      <div className="mt-6 space-y-4">
        {!isRepair && !isRetired && (
          <form action={repairFormAction} className="space-y-3">
            {repairState?.error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {repairState.error}
              </p>
            )}
            {repairState?.message && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {repairState.message}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              <span className="inline-flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Send To Repair
              </span>
            </button>
          </form>
        )}

        {isRepair && (
          <form action={completeFormAction} className="space-y-3">
            {completeState?.error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {completeState.error}
              </p>
            )}
            {completeState?.message && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {completeState.message}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              <span className="inline-flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Return From Repair
              </span>
            </button>
          </form>
        )}

        <form action={decommissionFormAction} className="space-y-3">
          {decommissionState?.error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {decommissionState.error}
            </p>
          )}
          {decommissionState?.message && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {decommissionState.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isRetired}
            className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <span className="inline-flex items-center gap-2">
              <Archive className="h-4 w-4" />
              {isRetired ? 'Already Retired' : 'Decommission Asset'}
            </span>
          </button>
        </form>
      </div>
    </section>
  )
}
