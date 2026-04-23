import { redirect } from 'next/navigation'

type Props = {
  searchParams?: { q?: string | string[]; status?: string | string[]; type?: string | string[]; new?: string | string[] }
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default function AssetsPage({ searchParams }: Props) {
  const params = new URLSearchParams()

  for (const [key, rawValue] of Object.entries(searchParams ?? {})) {
    const value = getSingleValue(rawValue)

    if (value) {
      params.set(key, value)
    }
  }

  const target = params.size > 0 ? `/dashboard/assets?${params.toString()}` : '/dashboard/assets'
  redirect(target)
}
