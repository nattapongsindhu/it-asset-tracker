export type WarrantyAlertLevel = 'healthy' | 'warning' | 'expired' | 'unknown'

export type WarrantyAlert = {
  daysRemaining: number | null
  isCritical: boolean
  label: string
  level: WarrantyAlertLevel
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

function pluralizeDays(value: number) {
  return `${value} day${value === 1 ? '' : 's'}`
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseWarrantyDate(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch

    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsedDate = new Date(trimmed)

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function getWarrantyDaysRemaining(value: Date | string | null | undefined, now = new Date()) {
  const warrantyDate = parseWarrantyDate(value)

  if (!warrantyDate) {
    return null
  }

  return Math.round(
    (startOfLocalDay(warrantyDate).getTime() - startOfLocalDay(now).getTime()) / MS_PER_DAY
  )
}

export function formatWarrantyTimeRemaining(
  value: Date | string | null | undefined,
  now = new Date()
) {
  const daysRemaining = getWarrantyDaysRemaining(value, now)

  if (daysRemaining === null) {
    return null
  }

  if (daysRemaining < 0) {
    return `Expired ${pluralizeDays(Math.abs(daysRemaining))} ago`
  }

  if (daysRemaining === 0) {
    return 'Expires today'
  }

  if (daysRemaining <= 30) {
    return `Expiring in ${pluralizeDays(daysRemaining)}`
  }

  return `${pluralizeDays(daysRemaining)} remaining`
}

export function getWarrantyAlert(value: Date | string | null | undefined, now = new Date()): WarrantyAlert {
  const daysRemaining = getWarrantyDaysRemaining(value, now)

  if (daysRemaining === null) {
    return {
      daysRemaining: null,
      isCritical: false,
      label: 'No warranty date',
      level: 'unknown',
    }
  }

  if (daysRemaining < 0) {
    return {
      daysRemaining,
      isCritical: true,
      label: formatWarrantyTimeRemaining(value, now) ?? 'Expired',
      level: 'expired',
    }
  }

  if (daysRemaining <= 30) {
    return {
      daysRemaining,
      isCritical: true,
      label: formatWarrantyTimeRemaining(value, now) ?? 'Expiring soon',
      level: 'warning',
    }
  }

  return {
    daysRemaining,
    isCritical: false,
    label: formatWarrantyTimeRemaining(value, now) ?? 'Protected',
    level: 'healthy',
  }
}
