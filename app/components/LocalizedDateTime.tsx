'use client'

import { useEffect, useState } from 'react'
import { formatWarrantyTimeRemaining } from '@/lib/warranty'

type Props = {
  fallback?: string
  includeTime?: boolean
  showTimeRemaining?: boolean
  showTimeZone?: boolean
  value: Date | string | null | undefined
}

function formatPlainDate(value: Date | string) {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
    }).format(value)
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!match) {
    return value
  }

  const [, year, month, day] = match
  const localDate = new Date(Number(year), Number(month) - 1, Number(day))

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(localDate)
}

function formatValue(value: Date | string, includeTime: boolean, timeZone: string) {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: includeTime ? 'short' : undefined,
      timeZone,
    }).format(value)
  }

  if (!includeTime || !value.includes('T')) {
    return formatPlainDate(value)
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date)
}

export function LocalizedDateTime({
  value,
  includeTime = false,
  showTimeZone = false,
  showTimeRemaining = false,
  fallback = '-',
}: Props) {
  const [timeZone, setTimeZone] = useState('UTC')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    setMounted(true)
  }, [])

  if (!value) {
    return <span>{fallback}</span>
  }

  const formatted = formatValue(value, includeTime, timeZone)
  const remaining = mounted && showTimeRemaining ? formatWarrantyTimeRemaining(value) : null

  return (
    <span suppressHydrationWarning>
      {mounted ? formatted : fallback}
      {mounted && remaining ? ` | ${remaining}` : ''}
      {mounted && includeTime && showTimeZone ? ` (${timeZone})` : ''}
    </span>
  )
}
