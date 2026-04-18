'use client'
import { deleteAsset } from '@/app/actions/assets'

export function DeleteAssetButton({ id, assetTag }: { id: string; assetTag: string }) {
  async function handleDelete() {
    if (!confirm(`Delete asset ${assetTag}? This cannot be undone.`)) return
    await deleteAsset(id)
  }

  return (
    <button
      onClick={handleDelete}
      className="bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700"
    >
      Delete
    </button>
  )
}
