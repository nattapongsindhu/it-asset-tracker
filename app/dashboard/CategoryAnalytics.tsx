'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PieChart } from 'lucide-react'

type CategoryShare = {
  color: string
  count: number
  href: string
  label: string
  percentage: number
}

type Props = {
  assignedRatio: number
  shares: CategoryShare[]
  totalAssets: number
}

const SVG_SIZE = 220
const CENTER = SVG_SIZE / 2
const RADIUS = 68
const STROKE_WIDTH = 34
const SEGMENT_GAP = 2

function polarToCartesian(angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x: CENTER + RADIUS * Math.cos(angleInRadians),
    y: CENTER + RADIUS * Math.sin(angleInRadians),
  }
}

function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(endAngle)
  const end = polarToCartesian(startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

export function CategoryAnalytics({ assignedRatio, shares, totalAssets }: Props) {
  const router = useRouter()
  const topCategory = shares[0]
  let currentAngle = 0

  function openCategory(href: string) {
    router.push(href)
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-[1.75rem] border border-slate-200 bg-[#f7f5ef] p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-white p-2 shadow-sm">
            <PieChart className="h-5 w-5 text-slate-700" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Distribution
            </p>
            <p className="text-sm font-medium text-slate-700">{shares.length} categories in view</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="relative h-[220px] w-[220px]">
            <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="h-full w-full">
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={STROKE_WIDTH}
              />
              {shares.map(share => {
                const sweepAngle = (share.percentage / 100) * 360
                const startAngle = currentAngle
                const endAngle = currentAngle + sweepAngle
                currentAngle = endAngle

                const adjustedStart = startAngle + SEGMENT_GAP / 2
                const adjustedEnd = endAngle - SEGMENT_GAP / 2
                const canDrawSegment = adjustedEnd > adjustedStart

                if (!canDrawSegment) {
                  return null
                }

                return (
                  <path
                    key={share.label}
                    d={describeArc(adjustedStart, adjustedEnd)}
                    fill="none"
                    stroke={share.color}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${share.label} assets`}
                    className="cursor-pointer transition-opacity hover:opacity-90 focus:opacity-90"
                    onClick={() => openCategory(share.href)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openCategory(share.href)
                      }
                    }}
                  />
                )
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Total
              </span>
              <span className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                {totalAssets}
              </span>
              <span className="mt-1 text-sm text-slate-500">assets</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Click a slice to open the filtered asset list
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Largest Category
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{topCategory?.label ?? 'None'}</p>
            <p className="mt-1 text-sm text-slate-500">{topCategory?.count ?? 0} assets</p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Assigned Ratio
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{assignedRatio}% assigned</p>
            <p className="mt-1 text-sm text-slate-500">Across the current inventory</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {shares.map(share => (
          <div key={share.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <Link href={share.href} className="text-sm font-semibold text-slate-900 hover:underline">
                {share.label}
              </Link>
              <span className="text-sm font-medium text-slate-500">
                {share.percentage}% of inventory
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full"
                style={{ backgroundColor: share.color, width: `${share.percentage}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>{share.count} assets</span>
              <span>Click to filter the asset list</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
