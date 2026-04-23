import Link from 'next/link'
import { Nav } from '@/app/components/Nav'
import { AssetForm } from '@/app/components/AssetForm'
import { createAsset } from '@/app/actions/assets'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AssetUserOption } from '@/types/app'

export default async function NewAssetPage() {
  await requireSupabaseAdmin('/assets')

  // TODO: Implement Supabase select for assignable users.
  const users: AssetUserOption[] = []

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/assets" className="text-sm text-gray-500 hover:text-gray-800">← Assets</Link>
          <h1 className="text-xl font-semibold text-gray-800 mt-1">New Asset</h1>
          <p className="text-xs text-gray-400 mt-2">TODO: Implement Supabase user lookup for assignments.</p>
        </div>
        <AssetForm action={createAsset} users={users} />
      </main>
    </>
  )
}
