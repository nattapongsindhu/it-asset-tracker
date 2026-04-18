import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/app/components/Nav'
import { AssetForm } from '@/app/components/AssetForm'
import { createAsset } from '@/app/actions/assets'
import Link from 'next/link'

export default async function NewAssetPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'ADMIN') redirect('/assets')

  const users = await prisma.user.findMany({
    select:  { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/assets" className="text-sm text-gray-500 hover:text-gray-800">← Assets</Link>
          <h1 className="text-xl font-semibold text-gray-800 mt-1">New Asset</h1>
        </div>
        <AssetForm action={createAsset} users={users} />
      </main>
    </>
  )
}
