import { LocalizedDateTime } from '@/app/components/LocalizedDateTime'
import type { MaintenanceLogRecord } from '@/types/app'

type Props = {
  entries: MaintenanceLogRecord[]
  ready: boolean
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '-'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function RepairHistoryPanel({ entries, ready }: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Repair History
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Maintenance log</h2>
      </div>

      {!ready ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
          Repair history will appear here after the Phase 3 maintenance migration is applied in Supabase.
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
          No maintenance activity has been logged for this asset yet.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {entries.map(entry => (
            <div key={entry.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.actionTaken}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {entry.technicianName ?? 'Technician not specified'}
                  </p>
                </div>
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {formatCurrency(entry.cost)}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-800">Logged At</dt>
                  <dd className="mt-1">
                    <LocalizedDateTime includeTime showTimeZone value={entry.createdAt} />
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-800">Logged By</dt>
                  <dd className="mt-1">{entry.createdBy?.email ?? '-'}</dd>
                </div>
              </dl>

              {entry.notes && (
                <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  {entry.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
