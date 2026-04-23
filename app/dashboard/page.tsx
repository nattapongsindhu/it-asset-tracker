import Link from 'next/link'
import { Nav } from '@/app/components/Nav'
import { getSupabaseSessionUser } from '@/lib/supabase/session'

export default async function DashboardPage() {
  const user = await getSupabaseSessionUser()

  // TODO: Implement Supabase aggregate queries for dashboard counts.
  const stats = [
    { label: 'Total Assets', value: 0, href: '/assets' },
    { label: 'In Stock', value: 0, href: '/assets?status=IN_STOCK' },
    { label: 'Assigned', value: 0, href: '/assets?status=ASSIGNED' },
    { label: 'In Repair', value: 0, href: '/assets?status=IN_REPAIR' },
    { label: 'Retired', value: 0, href: '/assets?status=RETIRED' },
  ]

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name ?? 'there'}</p>
          <p className="text-xs text-gray-400 mt-2">TODO: Implement Supabase dashboard counts.</p>
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
