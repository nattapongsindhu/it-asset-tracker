import Link from 'next/link'
import { Nav } from '@/app/components/Nav'
import { AssetForm } from '@/app/components/AssetForm'
import { updateAsset } from '@/app/actions/assets'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AssetRecord, AssetUserOption } from '@/types/app'

type Props = { params: { id: string } }

export default async function EditAssetPage({ params }: Props) {
  await requireSupabaseAdmin(`/assets/${params.id}`)

  // TODO: Implement Supabase select for editable asset detail and assignable users.
  const asset: AssetRecord = {
    id: params.id,
    assetTag: '',
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'IN_STOCK',
    assignedUserId: '',
    notes: '',
    warrantyExpiry: null,
  }
  const users: AssetUserOption[] = []

  const action = updateAsset.bind(null, params.id)

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href={`/assets/${params.id}`} className="text-sm text-gray-500 hover:text-gray-800">
            ← {params.id}
          </Link>
          <h1 className="text-xl font-semibold text-gray-800 mt-1">Edit Asset</h1>
          <p className="text-xs text-gray-400 mt-2">TODO: Implement Supabase edit form data loading.</p>
        </div>
        <AssetForm action={action} asset={asset} users={users} />
      </main>
    </>
  )
}
