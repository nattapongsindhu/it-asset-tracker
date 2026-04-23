'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteAsset } from '@/app/actions/assets'

export function DeleteAssetButton({ id, assetTag }: { id: string; assetTag: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    const confirmed = confirm(`Delete asset ${assetTag}? This cannot be undone.`)

    if (!confirmed) {
      return
    }

    startTransition(async () => {
      const result = await deleteAsset(id)

      if (result?.error) {
        alert(result.error)
        return
      }

      router.replace('/dashboard/assets')
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => handleDelete(id)}
      className="print-hide rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="inline-flex items-center gap-2">
        <Trash2 className="h-4 w-4" />
        {isPending ? 'Deleting...' : 'Delete'}
      </span>
    </button>
  )
}
