'use client'

import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { ArrowRightLeft, RotateCcw, UserCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  assignAssetToUser,
  returnAssetToStock,
  type AssignmentActionState,
} from '@/app/actions/assets'
import type { AssetStatus, AssetUserOption } from '@/types/app'

type Props = {
  assetId: string
  currentAssignedUserId: string | null
  currentAssignedUserLabel: string
  currentStatus: AssetStatus
  users: AssetUserOption[]
}

export function AssetAssignmentPanel({
  assetId,
  currentAssignedUserId,
  currentAssignedUserLabel,
  currentStatus,
  users,
}: Props) {
  const router = useRouter()
  const [assignState, assignFormAction] = useFormState<AssignmentActionState, FormData>(
    assignAssetToUser.bind(null, assetId),
    undefined
  )
  const [returnState, returnFormAction] = useFormState<AssignmentActionState, FormData>(
    returnAssetToStock.bind(null, assetId),
    undefined
  )

  useEffect(() => {
    if (assignState?.message || returnState?.message) {
      router.refresh()
    }
  }, [assignState?.message, returnState?.message, router])

  const assignmentLocked = currentStatus === 'IN_REPAIR' || currentStatus === 'RETIRED'
  const currentStatusLabel =
    currentStatus === 'ASSIGNED'
      ? 'In Use'
      : currentStatus === 'IN_STOCK'
        ? 'In Stock'
        : currentStatus === 'IN_REPAIR'
          ? 'Under Repair'
          : 'Retired'

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Check-in / Check-out
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Assignment controls</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Assigning moves the asset into the In Use workflow automatically. Returning it moves the
            record back to In Stock.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <UserCircle2 className="h-4 w-4 text-slate-500" />
            Current holder
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{currentAssignedUserLabel}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Current status</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{currentStatusLabel}</p>
        </div>
      </div>

      <form action={assignFormAction} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Assigned To</label>
          <select
            name="assignedUserId"
            defaultValue={currentAssignedUserId ?? ''}
            disabled={assignmentLocked || users.length === 0}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Select employee</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {assignmentLocked
              ? 'Repair and retired assets are locked out of the assignment workflow.'
              : users.length === 0
                ? 'No employee profiles are available yet in public.profiles.'
                : 'Choose a real employee from the profiles directory to assign or reassign this asset.'}
          </p>
        </div>

        {assignState?.error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {assignState.error}
          </p>
        )}
        {assignState?.message && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {assignState.message}
          </p>
        )}

        <button
          type="submit"
          disabled={assignmentLocked || users.length === 0}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <span className="inline-flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            {currentAssignedUserId ? 'Save Reassignment' : 'Assign Asset'}
          </span>
        </button>
      </form>

      {currentAssignedUserId && (
        <form action={returnFormAction} className="mt-4 border-t border-slate-100 pt-4">
          {returnState?.error && (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {returnState.error}
            </p>
          )}
          {returnState?.message && (
            <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {returnState.message}
            </p>
          )}

          <button
            type="submit"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Return To Stock
            </span>
          </button>
        </form>
      )}
    </section>
  )
}
