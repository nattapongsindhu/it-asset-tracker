import type { ReactNode } from 'react'
import type { AppSessionUser } from '@/types/app'
import { PlaceholderActionGroup } from './PlaceholderActionGroup'
import { Nav } from './Nav'

type Props = {
  children: ReactNode
  currentPath: string
  user: AppSessionUser
}

export function AppShell({ children, currentPath, user }: Props) {
  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-slate-900">
      <Nav currentPath={currentPath} user={user} />
      <div className="min-h-screen lg:pl-72">
        <header className="print-hide border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Safe, Clean, Orderly
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Signed in as {user.name} with {user.role.toLowerCase()} access.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role {user.role}
                </span>
                <PlaceholderActionGroup showEdit={isAdmin} />
              </div>
            </div>
          </div>
        </header>

        <main className="print-shell px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
