import Link from 'next/link'
import { AssetForm } from '@/app/components/AssetForm'
import { updateAsset } from '@/app/actions/assets'
import { AppShell } from '@/app/components/AppShell'
import { PlaceholderActionGroup } from '@/app/components/PlaceholderActionGroup'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AssetRecord, AssetUserOption } from '@/types/app'

type Props = { params: { id: string } }

export default async function EditAssetPage({ params }: Props) {
  const user = await requireSupabaseAdmin(`/assets/${params.id}`)
  const supabase = createSupabaseServerClient()

  let asset: AssetRecord = {
    id: params.id,
    assetTag: '',
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'IN_STOCK',
    assignedUserId: '',
    notes: '',
    warrantyExpiry: null,
  }

  let users: AssetUserOption[] = []

  try {
    const [{ data: assetRow }, { data: profileRows }] = await Promise.all([
      supabase
        .from('assets')
        .select(
          'id, asset_tag, category, brand, model, serial_number, status, assigned_user_id, warranty_expiry, notes'
        )
        .eq('id', params.id)
        .maybeSingle(),
      supabase.from('profiles').select('id, email').order('email'),
    ])

    if (assetRow) {
      asset = {
        assetTag: assetRow.asset_tag ?? '',
        assignedUserId: assetRow.assigned_user_id,
        brand: assetRow.brand ?? '',
        id: assetRow.id,
        model: assetRow.model ?? '',
        notes: assetRow.notes,
        serialNumber: assetRow.serial_number,
        status: assetRow.status ?? 'IN_STOCK',
        type: assetRow.category ?? '',
        warrantyExpiry: assetRow.warranty_expiry,
      }
    }

    users = (profileRows ?? []).map(profile => ({
      email: profile.email ?? '',
      id: profile.id,
      name: profile.email ?? 'Unknown user',
    }))
  } catch {
    users = []
  }

  const action = updateAsset.bind(null, params.id)

  return (
    <AppShell currentPath="/dashboard/assets" user={user}>
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href={`/assets/${params.id}`} className="text-sm font-medium text-slate-500 hover:text-slate-800">
              Back to asset record
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Edit Asset</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Review the current values, then update details in the same compact form layout.
            </p>
          </div>
          <PlaceholderActionGroup showEdit />
        </div>

        <AssetForm action={action} asset={asset} cancelHref={`/assets/${params.id}`} users={users} />
      </section>
    </AppShell>
  )
}
