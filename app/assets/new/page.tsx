import Link from 'next/link'
import { AssetForm } from '@/app/components/AssetForm'
import { createAsset } from '@/app/actions/assets'
import { AppShell } from '@/app/components/AppShell'
import { mapLocationOption } from '@/lib/locations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AssetLocationOption, AssetUserOption } from '@/types/app'

function getProfileLabel(email: string | null | undefined, fallback = 'Unknown user') {
  return email?.trim() || fallback
}

export default async function NewAssetPage() {
  const user = await requireSupabaseAdmin('/assets')
  const supabase = createSupabaseServerClient()

  let users: AssetUserOption[] = []
  let locations: AssetLocationOption[] = []

  try {
    const [{ data: profileRows }, { data: locationRows }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email')
        .not('email', 'is', null)
        .order('email'),
      supabase.from('locations').select('id, name, building, floor').order('name'),
    ])

    users = (profileRows ?? []).map(profile => ({
      email: getProfileLabel(profile.email, ''),
      id: profile.id,
      name: getProfileLabel(profile.email),
    }))
    locations = (locationRows ?? []).map(mapLocationOption)
  } catch {
    users = []
    locations = []
  }

  return (
    <AppShell currentPath="/dashboard/assets" user={user}>
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/dashboard/assets" className="text-sm font-medium text-slate-500 hover:text-slate-800">
              Back to assets
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">New Asset</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Create a new asset record with clean defaults and a compact assignment workflow.
            </p>
          </div>
        </div>

        <AssetForm action={createAsset} cancelHref="/dashboard/assets" locations={locations} users={users} />
      </section>
    </AppShell>
  )
}
