import { PencilLine } from 'lucide-react'

type Props = {
  className?: string
  compact?: boolean
  showEdit?: boolean
}

function getButtonClassName(compact: boolean) {
  return compact
    ? 'rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400'
    : 'rounded-full border border-dashed border-slate-300 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'
}

export function PlaceholderActionGroup({
  className = '',
  compact = false,
  showEdit = true,
}: Props) {
  const buttonClassName = getButtonClassName(compact)

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {showEdit && (
        <button type="button" disabled className={buttonClassName}>
          <span className="inline-flex items-center gap-1.5">
            <PencilLine className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            Edit
          </span>
        </button>
      )}
    </div>
  )
}
