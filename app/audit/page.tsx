import Link from 'next/link'
import { ClearAuditLogsButton, DeleteAuditLogButton } from './AuditLogActions'
import { AppShell } from '@/app/components/AppShell'
import { LocalizedDateTime } from '@/app/components/LocalizedDateTime'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AuditLogRecord } from '@/types/app'

type AuditLogRow = {
  action: string
  actor_id: string | null
  created_at: string
  detail: unknown
  entity_id: string | null
  entity_type: string | null
  id: string
}

type ProfileRow = {
  email: string | null
  id: string
}

function formatDetailValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return '-'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(item => formatDetailValue(item)).join(', ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function formatAuditDetail(row: AuditLogRow) {
  if (row.detail && typeof row.detail === 'object' && !Array.isArray(row.detail)) {
    const detailEntries = Object.entries(row.detail as Record<string, unknown>).map(([key, value]) => {
      const label = key.replace(/_/g, ' ')
      return `${label}: ${formatDetailValue(value)}`
    })

    if (detailEntries.length > 0) {
      return detailEntries.join(' | ')
    }
  }

  if (typeof row.detail !== 'undefined' && row.detail !== null) {
    return formatDetailValue(row.detail)
  }

  if (row.entity_type || row.entity_id) {
    return `${row.entity_type ?? 'entity'}${row.entity_id ? `: ${row.entity_id}` : ''}`
  }

  return null
}

export default async function AuditLogPage() {
  const user = await requireSupabaseAdmin('/dashboard')
  const supabase = createSupabaseServerClient()

  let logs: AuditLogRecord[] = []
  let loadError = ''

  try {
    const { data: auditRows, error: auditError } = await supabase
      .from('audit_logs')
      .select('id, action, detail, created_at, actor_id, entity_type, entity_id')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (auditError) {
      throw auditError
    }

    const actorIds = Array.from(
      new Set(
        (auditRows ?? [])
          .map(row => row.actor_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    )

    let profilesById = new Map<string, ProfileRow>()

    if (actorIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', actorIds)

      if (profileError) {
        throw profileError
      }

      profilesById = new Map((profileRows ?? []).map(profile => [profile.id, profile]))
    }

    logs = (auditRows ?? []).map((row: AuditLogRow) => {
      const actor = row.actor_id ? profilesById.get(row.actor_id) : null

      return {
        action: row.action,
        createdAt: row.created_at,
        detail: formatAuditDetail(row),
        id: row.id,
        user: actor
          ? {
              email: actor.email ?? '',
              name: actor.email ?? 'Unknown user',
            }
          : null,
      }
    })
  } catch {
    loadError = 'Unable to load audit entries right now.'
  }

  return (
    <AppShell currentPath="/audit" user={user}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800">
              Back to dashboard
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Admin Audit</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Audit Log</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Review recent system activity captured in the Supabase-backed audit timeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ClearAuditLogsButton disabled={logs.length === 0} />
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          {loadError ? (
            <p className="p-6 text-sm text-rose-600">{loadError}</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No audit entries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Detail</th>
                  <th className="print-hide px-4 py-3 text-left font-medium text-slate-600">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      <LocalizedDateTime includeTime showTimeZone value={log.createdAt} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.user?.name ?? log.user?.email ?? <span className="text-slate-400">system</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.detail ?? '-'}</td>
                    <td className="print-hide px-4 py-3">
                      <DeleteAuditLogButton id={log.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Showing last {logs.length} entries (max 1000)
        </p>
      </section>
    </AppShell>
  )
}
