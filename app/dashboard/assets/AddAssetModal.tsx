'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { AssetForm } from '@/app/components/AssetForm'
import type { AssetLocationOption, AssetUserOption } from '@/types/app'

type ActionState = { error?: string } | undefined

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  locations: AssetLocationOption[]
  openByDefault?: boolean
  users: AssetUserOption[]
}

function removeNewParam(searchParams: { toString(): string }) {
  const nextParams = new URLSearchParams(searchParams.toString())
  nextParams.delete('new')
  return nextParams
}

function addNewParam(searchParams: { toString(): string }) {
  const nextParams = new URLSearchParams(searchParams.toString())
  nextParams.set('new', '1')
  return nextParams
}

export function AddAssetModal({ action, locations, openByDefault = false, users }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOpen = openByDefault || searchParams.get('new') === '1'

  function buildTarget(nextParams: URLSearchParams) {
    return nextParams.toString().length > 0 ? `${pathname}?${nextParams.toString()}` : pathname
  }

  function openModal() {
    router.push(buildTarget(addNewParam(searchParams)), { scroll: false })
  }

  function closeModal() {
    if (!searchParams.has('new')) {
      return
    }

    router.replace(buildTarget(removeNewParam(searchParams)), { scroll: false })
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="print-hide rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        <span className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Asset
        </span>
      </button>

      {isOpen && (
        <div className="print-hide fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 sm:p-8">
          <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-[#f7f5ef] p-5 shadow-2xl shadow-slate-950/20 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Asset Intake
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create a new asset</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add the core inventory details here, then save to refresh the dashboard list.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
                aria-label="Close asset modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <AssetForm
              action={action}
              cancelHref={buildTarget(removeNewParam(searchParams))}
              locations={locations}
              submitLabel="Create Asset"
              users={users}
            />
          </div>
        </div>
      )}
    </>
  )
}
