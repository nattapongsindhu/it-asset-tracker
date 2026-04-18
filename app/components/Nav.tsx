import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { SignOutButton } from './SignOutButton'

export async function Nav() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const isAdmin = session.user.role === 'ADMIN'

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-gray-800 text-sm tracking-wide">IT Asset Tracker</span>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/assets"    className="text-gray-600 hover:text-gray-900">Assets</Link>
          {isAdmin && (
            <Link href="/audit" className="text-gray-600 hover:text-gray-900">Audit Log</Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">{session.user.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {session.user.role}
        </span>
        <SignOutButton />
      </div>
    </nav>
  )
}
