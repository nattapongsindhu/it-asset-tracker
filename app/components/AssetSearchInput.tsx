'use client'

import { useEffect, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Props = {
  defaultValue?: string
  placeholder?: string
}

export function AssetSearchInput({
  defaultValue = '',
  placeholder = 'Search asset tag, model, serial...',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultValue)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentValue = searchParams.get('q') ?? ''

      if (value.trim() === currentValue.trim()) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())

      if (value.trim()) {
        params.set('q', value.trim())
      } else {
        params.delete('q')
      }

      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
          scroll: false,
        })
      })
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [pathname, router, searchParams, startTransition, value])

  return (
    <label className="relative block w-full sm:w-72">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        name="q"
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
      />
    </label>
  )
}
