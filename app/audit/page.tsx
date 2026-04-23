import { AppShell } from '@/app/components/AppShell'
import { PlaceholderActionGroup } from '@/app/components/PlaceholderActionGroup'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AuditLogRecord } from '@/types/app'

export default async function AuditLogPage() {
  const user = await requireSupabaseAdmin('/dashboard')

  // TODO: Implement Supabase select for recent audit log entries.
  const logs: AuditLogRecord[] = []

  return (
    <AppShell currentPath="/audit" user={user}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Admin Audit</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Audit Log</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Review recent system activity and keep the admin view compact until the full audit query lands.
            </p>
          </div>
          <PlaceholderActionGroup showEdit />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No audit entries yet. Supabase audit reads are still pending.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.user?.name ?? <span className="text-slate-400">system</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.detail ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Showing last {logs.length} entries
        </p>
      </section>
    </AppShell>
  )
}
