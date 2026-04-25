import type { AssetLocationOption } from '@/types/app'

export type AssetLocationRow = {
  building: string | null
  floor: string | null
  id: string
  name: string | null
}

function normalizePart(value: string | null | undefined) {
  return value?.trim() || ''
}

export function formatLocationLabel(
  location: Pick<AssetLocationRow, 'name' | 'building' | 'floor'> | null | undefined,
  fallback = 'Unassigned'
) {
  if (!location) {
    return fallback
  }

  const parts = [normalizePart(location.name), normalizePart(location.building), normalizePart(location.floor)]
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' - ') : fallback
}

export function mapLocationOption(location: AssetLocationRow): AssetLocationOption {
  return {
    building: location.building,
    floor: location.floor,
    id: location.id,
    label: formatLocationLabel(location),
    name: location.name ?? 'Unnamed location',
  }
}
