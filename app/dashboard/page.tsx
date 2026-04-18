import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/app/components/Nav'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const [total, inStock, assigned, inRepair, retired] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: 'IN_STOCK' } }),
    prisma.asset.count({ where: { status: 'ASSIGNED' } }),
    prisma.asset.count({ where: { status: 'IN_REPAIR' } }),
    prisma.asset.count({ where: { status: 'RETIRED' } }),
  ])

  const stats = [
    { label: 'Total Assets',  value: total,    href: '/assets' },
    { label: 'In Stock',      value: inStock,   href: '/assets?status=IN_STOCK' },
    { label: 'Assigned',      value: assigned,  href: '/assets?status=ASSIGNED' },
    { label: 'In Repair',     value: inRepair,  href: '/assets?status=IN_REPAIR' },
    { label: 'Retired',       value: retired,   href: '/assets?status=RETIRED' },
  ]

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {session?.user.name}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map(s => (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
