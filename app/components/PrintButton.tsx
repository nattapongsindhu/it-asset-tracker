'use client'

import { Printer } from 'lucide-react'

type Props = {
  className?: string
  compact?: boolean
  label?: string
}

export function PrintButton({ className, compact = false, label = 'Print' }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        `print-hide rounded-full border border-slate-300 bg-white ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        } font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900`
      }
    >
      <span className="inline-flex items-center gap-2">
        <Printer className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {label}
      </span>
    </button>
  )
}
