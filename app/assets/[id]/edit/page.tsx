import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/app/components/Nav'
import { AssetForm } from '@/app/components/AssetForm'
import { updateAsset } from '@/app/actions/assets'
import Link from 'next/link'

type Props = { params: { id: string } }

export default async function EditAssetPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'ADMIN') redirect(`/assets/${params.id}`)

  const [asset, users] = await Promise.all([
    prisma.asset.findUnique({ where: { id: params.id } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
  ])
  if (!asset) notFound()

  // bind id so the action signature matches (state, formData) => Promise<state>
  const action = updateAsset.bind(null, asset.id)

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href={`/assets/${asset.id}`} className="text-sm text-gray-500 hover:text-gray-800">
            ← {asset.assetTag}
          </Link>
          <h1 className="text-xl font-semibold text-gray-800 mt-1">Edit Asset</h1>
        </div>
        <AssetForm action={action} asset={asset} users={users} />
      </main>
    </>
  )
}
