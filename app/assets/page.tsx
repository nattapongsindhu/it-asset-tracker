import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/app/components/Nav'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK:  'In Stock',
  ASSIGNED:  'Assigned',
  IN_REPAIR: 'In Repair',
  RETIRED:   'Retired',
}

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK:  'bg-green-100 text-green-700',
  ASSIGNED:  'bg-blue-100 text-blue-700',
  IN_REPAIR: 'bg-yellow-100 text-yellow-700',
  RETIRED:   'bg-gray-100 text-gray-500',
}

type Props = {
  searchParams: { q?: string; status?: string; type?: string }
}

export default async function AssetsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === 'ADMIN'

  const { q, status, type } = searchParams

  const assets = await prisma.asset.findMany({
    where: {
      AND: [
        status ? { status } : {},
        type   ? { type: { contains: type } } : {},
        q ? {
          OR: [
            { assetTag:     { contains: q } },
            { brand:        { contains: q } },
            { model:        { contains: q } },
            { serialNumber: { contains: q } },
          ],
        } : {},
      ],
    },
    include: { assignedUser: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  const types = await prisma.asset.findMany({
    distinct: ['type'],
    select:   { type: true },
    orderBy:  { type: 'asc' },
  })

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-800">Assets</h1>
          {isAdmin && (
            <Link
              href="/assets/new"
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
            >
              + New Asset
            </Link>
          )}
        </div>

        {/* filters */}
        <form method="GET" className="flex flex-wrap gap-3 mb-6">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search tag, brand, model, serial…"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="status"
            defaultValue={status ?? ''}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
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

        {/* table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {assets.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">No assets found.</p>
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
                {assets.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/assets/${a.id}`} className="font-mono text-blue-600 hover:underline">
                        {a.assetTag}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.type}</td>
                    <td className="px-4 py-3 text-gray-800">{a.brand} {a.model}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.assignedUser?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : '—'}
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
