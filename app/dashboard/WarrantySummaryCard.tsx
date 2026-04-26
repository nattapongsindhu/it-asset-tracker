'use client'

import Link from 'next/link'
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { getWarrantyAlert } from '@/lib/warranty'

type Props = {
  searchQuery?: string
  warrantyDates: Array<string | null>
}

export function WarrantySummaryCard({ warrantyDates, searchQuery = '' }: Props) {
  const alerts = warrantyDates.map(value => getWarrantyAlert(value))
  const expiredCount = alerts.filter(alert => alert.level === 'expired').length
  const expiringSoonCount = alerts.filter(alert => alert.level === 'warning').length
  const protectedCount = alerts.filter(alert => alert.level === 'healthy').length
  const missingCount = alerts.filter(alert => alert.level === 'unknown').length
  const criticalCount = expiredCount + expiringSoonCount
  const hasCritical = criticalCount > 0

  return (
    <section className="print-hide rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Warranty Watch
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Critical warranty summary</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Track expired coverage and assets that need action within the next 30 days before
            repair or replacement work slips.
          </p>
        </div>
        <Link
          href={searchQuery ? `/dashboard/assets?q=${encodeURIComponent(searchQuery)}` : '/dashboard/assets'}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          Review asset list
        </Link>
      </div>

      <div
        className={`mt-5 rounded-[1.5rem] border px-4 py-4 sm:px-5 ${
          hasCritical
            ? 'border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50'
            : 'border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50'
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            hasCritical ? 'text-rose-700' : 'text-emerald-700'
          }`}
        >
          {hasCritical
            ? `${criticalCount} asset${criticalCount === 1 ? '' : 's'} need warranty attention now`
            : 'No urgent warranty issues in the current view'}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {searchQuery
            ? `Filtered for "${searchQuery}".`
            : 'This snapshot updates from the current browser view.'}{' '}
          Expired assets and those due within 30 days are highlighted first on mobile and desktop.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Expired</p>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{expiredCount}</p>
          <p className="mt-2 text-sm text-rose-700">Coverage already lapsed.</p>
        </div>

        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Due In 30 Days
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {expiringSoonCount}
          </p>
          <p className="mt-2 text-sm text-amber-700">Schedule follow-up before coverage ends.</p>
        </div>

        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Protected
            </p>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {protectedCount}
          </p>
          <p className="mt-2 text-sm text-emerald-700">More than 30 days of coverage remain.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {criticalCount} critical asset{criticalCount === 1 ? '' : 's'}
        </span>
        {missingCount > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            {missingCount} without warranty dates
          </span>
        )}
      </div>
    </section>
  )
}
