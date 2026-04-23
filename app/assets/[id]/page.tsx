import Link from 'next/link'
import { Nav } from '@/app/components/Nav'
import { getSupabaseSessionUser } from '@/lib/supabase/session'
import { DeleteAssetButton } from './DeleteAssetButton'

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'Assigned',
  IN_REPAIR: 'In Repair',
  RETIRED: 'Retired',
}

type Props = { params: { id: string } }

export default async function AssetDetailPage({ params }: Props) {
  const user = await getSupabaseSessionUser()
  const isAdmin = user?.role === 'ADMIN'

  // TODO: Implement Supabase select for asset detail by id.
  const rows = [
    { label: 'Asset Tag', value: params.id },
    { label: 'Type', value: '-' },
    { label: 'Brand', value: '-' },
    { label: 'Model', value: '-' },
    { label: 'Serial Number', value: '-' },
    { label: 'Status', value: STATUS_LABELS.IN_STOCK },
    { label: 'Assigned To', value: '-' },
    { label: 'Warranty Expiry', value: '-' },
    { label: 'Created', value: '-' },
    { label: 'Last Updated', value: '-' },
  ]

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/assets" className="text-sm text-gray-500 hover:text-gray-800">← Assets</Link>
            <h1 className="text-xl font-semibold text-gray-800 mt-1 font-mono">{params.id}</h1>
            <p className="text-xs text-gray-400 mt-2">TODO: Implement Supabase asset detail query.</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Link
                href={`/assets/${params.id}/edit`}
                className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded hover:bg-gray-50"
              >
                Edit
              </Link>
              <DeleteAssetButton id={params.id} assetTag={params.id} />
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {rows.map(row => (
            <div key={row.label} className="flex px-5 py-3">
              <span className="w-40 text-sm text-gray-500 shrink-0">{row.label}</span>
              <span className="text-sm text-gray-800">{row.value}</span>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
