import { redirect } from 'next/navigation'
import { Nav } from '@/app/components/Nav'
import { getSupabaseSessionUser } from '@/lib/supabase/session'
import type { AuditLogRecord } from '@/types/app'

export default async function AuditLogPage() {
  const user = await getSupabaseSessionUser()

  if (user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // TODO: Implement Supabase select for recent audit log entries.
  const logs: AuditLogRecord[] = []

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Audit Log</h1>
        <p className="text-xs text-gray-400 mb-6">TODO: Implement Supabase audit log query.</p>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">No audit entries yet. Supabase audit reads are still pending.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.user?.name ?? <span className="text-gray-400">system</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.detail ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">Showing last {logs.length} entries</p>
      </main>
    </>
  )
}
