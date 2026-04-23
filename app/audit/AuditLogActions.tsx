'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { clearAuditLogs, deleteAuditLog } from '@/app/actions/audit'

export function DeleteAuditLogButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    const confirmed = confirm('Delete this audit log entry? This cannot be undone.')

    if (!confirmed) {
      return
    }

    startTransition(async () => {
      const result = await deleteAuditLog(id)

      if (result?.error) {
        alert(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      className="print-hide rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="inline-flex items-center gap-1.5">
        <Trash2 className="h-3.5 w-3.5" />
        {isPending ? 'Deleting' : 'Delete'}
      </span>
    </button>
  )
}

export function ClearAuditLogsButton({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClear() {
    const confirmed = confirm('Clear all audit log entries? This cannot be undone.')

    if (!confirmed) {
      return
    }

    startTransition(async () => {
      const result = await clearAuditLogs()

      if (result?.error) {
        alert(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={handleClear}
      className="print-hide rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="inline-flex items-center gap-2">
        <Trash2 className="h-4 w-4" />
        {isPending ? 'Clearing...' : 'Clear Audit Log'}
      </span>
    </button>
  )
}
