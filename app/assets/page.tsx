import Link from 'next/link'
import { Nav } from '@/app/components/Nav'
import { getSupabaseSessionUser } from '@/lib/supabase/session'
import type { AssetRecord } from '@/types/app'

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'Assigned',
  IN_REPAIR: 'In Repair',
  RETIRED: 'Retired',
}

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: 'bg-green-100 text-green-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_REPAIR: 'bg-yellow-100 text-yellow-700',
  RETIRED: 'bg-gray-100 text-gray-500',
}

type Props = {
  searchParams: { q?: string; status?: string; type?: string }
}

export default async function AssetsPage({ searchParams }: Props) {
  const user = await getSupabaseSessionUser()
  const isAdmin = user?.role === 'ADMIN'
  const { q, status, type } = searchParams

  // TODO: Implement Supabase select for asset list and filters.
  const assets: AssetRecord[] = []
  const types: Array<{ type: string }> = []

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Assets</h1>
            <p className="text-xs text-gray-400 mt-2">TODO: Implement Supabase asset list query.</p>
          </div>
          {isAdmin && (
            <Link
              href="/assets/new"
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
            >
              + New Asset
            </Link>
          )}
        </div>

        <form method="GET" className="flex flex-wrap gap-3 mb-6">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search tag, brand, model, serial..."
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="status"
            defaultValue={status ?? ''}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={type ?? ''}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">All types</option>
            {types.map(t => (
              <option key={t.type} value={t.type}>{t.type}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-gray-800 text-white text-sm px-4 py-1.5 rounded hover:bg-gray-700"
          >
            Filter
          </button>
          {(q || status || type) && (
            <Link href="/assets" className="text-sm text-gray-500 self-center hover:text-gray-800">
              Clear
            </Link>
          )}
        </form>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {assets.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">No assets found. Supabase reads are still pending.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tag</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Brand / Model</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Warranty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/assets/${asset.id}`} className="font-mono text-blue-600 hover:underline">
                        {asset.assetTag}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{asset.type}</td>
                    <td className="px-4 py-3 text-gray-800">{asset.brand} {asset.model}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[asset.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[asset.status] ?? asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{asset.assignedUser?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
      </main>
    </>
  )
}
