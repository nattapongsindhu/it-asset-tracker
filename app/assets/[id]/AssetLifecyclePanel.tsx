'use client'

import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { Archive, RotateCcw, Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  completeAssetRepair,
  decommissionAsset,
  logMaintenanceEntry,
  sendAssetToRepair,
  type LifecycleActionState,
  type MaintenanceActionState,
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

function RepairFormFields() {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700">Action Taken</label>
        <input
          name="actionTaken"
          required
          placeholder="Diagnosed charging issue, replaced battery, cleaned fan..."
          className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Technician Name</label>
          <input
            name="technicianName"
            placeholder="Internal tech or vendor"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Cost</label>
          <input
            name="cost"
            min="0"
            step="0.01"
            type="number"
            placeholder="0.00"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Warranty claim, parts ordered, vendor ETA, or follow-up notes..."
          className="mt-2 w-full rounded-[1.5rem] border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
      </div>
    </>
  )
}

function FormFeedback({
  state,
}: {
  state: LifecycleActionState | MaintenanceActionState
}) {
  if (state?.error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {state.error}
      </p>
    )
  }

  if (state?.message) {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.message}
      </p>
    )
  }

  return null
}

export function AssetLifecyclePanel({ assetId, currentStatus }: Props) {
  const router = useRouter()
  const [repairState, repairFormAction] = useFormState<LifecycleActionState, FormData>(
    sendAssetToRepair.bind(null, assetId),
    undefined
  )
  const [maintenanceState, maintenanceFormAction] = useFormState<MaintenanceActionState, FormData>(
    logMaintenanceEntry.bind(null, assetId),
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
    if (
      repairState?.message ||
      maintenanceState?.message ||
      completeState?.message ||
      decommissionState?.message
    ) {
      router.refresh()
    }
  }, [
    completeState?.message,
    decommissionState?.message,
    maintenanceState?.message,
    repairState?.message,
    router,
  ])

  const isRetired = currentStatus === 'RETIRED'
  const isRepair = currentStatus === 'IN_REPAIR'
  const activeFormAction = isRepair ? maintenanceFormAction : repairFormAction
  const activeFormState = isRepair ? maintenanceState : repairState

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lifecycle</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Repair and decommission</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Move assets through repair intake, log work details, and archive devices without losing audit history.
        </p>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Current lifecycle state</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{getStatusLabel(currentStatus)}</p>
      </div>

      {!isRetired && (
        <form action={activeFormAction} className="mt-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {isRepair ? 'Log maintenance' : 'Repair intake'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isRepair
                ? 'Capture technician notes, labor, and repair cost while the asset stays in the Under Repair workflow.'
                : 'The first repair log is saved at the same time the asset enters the Under Repair workflow.'}
            </p>
          </div>

          <RepairFormFields />
          <FormFeedback state={activeFormState} />

          <button
            type="submit"
            className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            <span className="inline-flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {isRepair ? 'Log Maintenance' : 'Send To Repair And Log Intake'}
            </span>
          </button>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {isRepair && (
          <form action={completeFormAction} className="space-y-3 border-t border-slate-100 pt-4">
            <FormFeedback state={completeState} />
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

        <form action={decommissionFormAction} className="space-y-3 border-t border-slate-100 pt-4">
          <FormFeedback state={decommissionState} />
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
