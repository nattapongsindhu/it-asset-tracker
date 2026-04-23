import Link from 'next/link'
import { Boxes, LayoutDashboard, ShieldCheck } from 'lucide-react'
import type { AppSessionUser } from '@/types/app'
import { SignOutButton } from './SignOutButton'

const NAV_ITEMS = [
  {
    description: 'Overview and status counts',
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    description: 'Inventory and assignments',
    href: '/dashboard/assets',
    icon: Boxes,
    label: 'Assets',
  },
] as const

type Props = {
  currentPath: string
  user: AppSessionUser
}

function isActive(href: string, currentPath: string) {
  return href === '/dashboard/assets'
    ? currentPath === '/dashboard/assets' ||
        currentPath.startsWith('/dashboard/assets/') ||
        currentPath === '/assets' ||
        currentPath.startsWith('/assets/')
    : currentPath === href || currentPath.startsWith(`${href}/`)
}

export function Nav({ currentPath, user }: Props) {
  const isAdmin = user.role === 'ADMIN'
  const auditShortcutHref = currentPath === '/audit' ? '/dashboard' : '/audit'
  const auditShortcutLabel = currentPath === '/audit' ? 'Back to Dashboard' : 'Open Audit Log'
  const auditShortcutText =
    currentPath === '/audit'
      ? 'Return to the main dashboard after reviewing admin activity.'
      : 'Use the audit route directly while the admin utility menu stays intentionally small.'

  return (
    <>
      <aside className="print-hide hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-[#fbfaf6]">
        <div className="flex h-full flex-col px-6 py-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              IT Asset Tracker
            </p>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">Portfolio Lite</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Practical internal asset tracking with clear access control and compact workflows.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current User</p>
            <p className="mt-3 text-base font-semibold text-slate-900">{user.name}</p>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {user.role}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Menu</p>
            </div>
            <nav className="space-y-2">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href, currentPath)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl border px-4 py-3 transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full border p-2 ${
                            active ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                        </span>
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          active ? 'text-slate-200' : 'text-slate-400'
                        }`}
                      >
                        Open
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-sm ${
                        active ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {item.description}
                    </p>
                  </Link>
                )
              })}
            </nav>
          </div>

          {isAdmin && (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                  Admin Access
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {auditShortcutText}
              </p>
              <Link
                href={auditShortcutHref}
                className="mt-4 inline-flex rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                {auditShortcutLabel}
              </Link>
            </div>
          )}

          <div className="mt-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Session</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isAdmin
                ? 'Admin mode is active. Management buttons are visible where needed.'
                : 'Staff mode is active. Management buttons stay hidden for read-only use.'}
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="print-hide border-b border-slate-200 bg-white px-4 py-4 shadow-sm lg:hidden">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                IT Asset Tracker
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Portfolio Lite</p>
              <p className="mt-1 text-sm text-slate-500">
                {user.name} - {user.role}
              </p>
            </div>
            <SignOutButton className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600" />
          </div>

          <div className="flex flex-wrap gap-2">
            {NAV_ITEMS.map(item => {
              const active = isActive(item.href, currentPath)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                href="/audit"
                className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900"
              >
                Audit
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
