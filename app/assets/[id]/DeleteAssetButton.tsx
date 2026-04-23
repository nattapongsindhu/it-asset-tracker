'use client'

export function DeleteAssetButton({ assetTag }: { id: string; assetTag: string }) {
  function handleDelete() {
    const confirmed = confirm(`Delete asset ${assetTag}? This cannot be undone.`)

    if (!confirmed) {
      return
    }

    alert('TODO: Implement Supabase asset delete.')
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
