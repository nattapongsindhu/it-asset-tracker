'use client'

import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { requestRepair, type RepairRequestActionState } from '@/app/actions/assets'

type Props = {
  assetId: string
}

export function AssetRepairRequestButton({ assetId }: Props) {
  const router = useRouter()
  const [state, formAction] = useFormState<RepairRequestActionState, FormData>(
    requestRepair.bind(null, assetId),
    undefined
  )

  useEffect(() => {
    if (state?.message) {
      router.refresh()
    }
  }, [router, state?.message])

  return (
    <form action={formAction} className="space-y-3">
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
        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        <span className="inline-flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Request Repair
        </span>
      </button>
    </form>
  )
}
