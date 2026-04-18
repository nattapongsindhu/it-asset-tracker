import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/app/components/Nav'
import { DeleteAssetButton } from './DeleteAssetButton'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK:  'In Stock',
  ASSIGNED:  'Assigned',
  IN_REPAIR: 'In Repair',
  RETIRED:   'Retired',
}

type Props = { params: { id: string } }

export default async function AssetDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === 'ADMIN'

  const asset = await prisma.asset.findUnique({
    where:   { id: params.id },
    include: { assignedUser: { select: { id: true, name: true, email: true } } },
  })
  if (!asset) notFound()

  const rows = [
    { label: 'Asset Tag',     value: asset.assetTag },
    { label: 'Type',          value: asset.type },
    { label: 'Brand',         value: asset.brand },
    { label: 'Model',         value: asset.model },
    { label: 'Serial Number', value: asset.serialNumber ?? '—' },
    { label: 'Status',        value: STATUS_LABELS[asset.status] ?? asset.status },
    { label: 'Assigned To',   value: asset.assignedUser ? `${asset.assignedUser.name} (${asset.assignedUser.email})` : '—' },
    { label: 'Warranty Expiry', value: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '—' },
    { label: 'Created',       value: new Date(asset.createdAt).toLocaleString() },
    { label: 'Last Updated',  value: new Date(asset.updatedAt).toLocaleString() },
  ]

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/assets" className="text-sm text-gray-500 hover:text-gray-800">← Assets</Link>
            <h1 className="text-xl font-semibold text-gray-800 mt-1 font-mono">{asset.assetTag}</h1>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Link
                href={`/assets/${asset.id}/edit`}
                className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded hover:bg-gray-50"
              >
                Edit
              </Link>
              <DeleteAssetButton id={asset.id} assetTag={asset.assetTag} />
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {rows.map(r => (
            <div key={r.label} className="flex px-5 py-3">
              <span className="w-40 text-sm text-gray-500 shrink-0">{r.label}</span>
              <span className="text-sm text-gray-800">{r.value}</span>
            </div>
          ))}
        </div>

        {asset.notes && (
          <div className="bg-white border border-gray-200 rounded-lg mt-4 p-5">
            <p className="text-xs font-medium text-gray-500 mb-2">Notes</p>
            {/* notes rendered as plain text — no innerHTML, no XSS risk */}
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}
      </main>
    </>
  )
}
