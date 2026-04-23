'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'

type ActionState = { error?: string } | undefined

const STATUSES = ['IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'RETIRED'] as const

const assetSchema = z.object({
  assetTag: z.string().min(1).max(50).trim(),
  type: z.string().min(1).max(50).trim(),
  brand: z.string().min(1).max(50).trim(),
  model: z.string().min(1).max(100).trim(),
  serialNumber: z.string().max(100).trim().optional(),
  status: z.enum(STATUSES),
  assignedUserId: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().max(2000).trim().optional(),
})

function normalizeOptionalValue(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null
}

function revalidateAssetViews(assetId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/assets')
  revalidatePath('/assets')
  revalidatePath('/audit')

  if (assetId) {
    revalidatePath(`/assets/${assetId}`)
    revalidatePath(`/assets/${assetId}/edit`)
  }
}

export async function createAsset(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSupabaseAdmin('/dashboard/assets')
  const supabase = createSupabaseServerClient()

  const raw = {
    assetTag: formData.get('assetTag'),
    type: formData.get('type'),
    brand: formData.get('brand'),
    model: formData.get('model'),
    serialNumber: formData.get('serialNumber') || undefined,
    status: formData.get('status'),
    assignedUserId: formData.get('assignedUserId') || undefined,
    warrantyExpiry: formData.get('warrantyExpiry') || undefined,
    notes: formData.get('notes') || undefined,
  }

  const parsed = assetSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: 'Invalid input. Check all required fields.' }
  }

  const payload = {
    asset_tag: parsed.data.assetTag,
    assigned_user_id: normalizeOptionalValue(parsed.data.assignedUserId),
    brand: parsed.data.brand,
    category: parsed.data.type,
    created_by: user.id,
    model: parsed.data.model,
    notes: normalizeOptionalValue(parsed.data.notes),
    serial_number: normalizeOptionalValue(parsed.data.serialNumber),
    status: parsed.data.status,
    warranty_expiry: normalizeOptionalValue(parsed.data.warrantyExpiry),
  }

  const { data, error } = await supabase
    .from('assets')
    .insert(payload)
    .select('id, asset_tag')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Unable to create the asset right now.' }
  }

  await logAudit({
    action: 'ASSET_CREATED',
    detail: { assetTag: data.asset_tag, status: payload.status },
    entityId: data.id,
    entityType: 'asset',
    userId: user.id,
  })

  revalidateAssetViews(data.id)
  redirect('/dashboard/assets')
}

export async function updateAsset(id: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSupabaseAdmin(`/assets/${id}`)
  const supabase = createSupabaseServerClient()

  const raw = {
    assetTag: formData.get('assetTag'),
    type: formData.get('type'),
    brand: formData.get('brand'),
    model: formData.get('model'),
    serialNumber: formData.get('serialNumber') || undefined,
    status: formData.get('status'),
    assignedUserId: formData.get('assignedUserId') || undefined,
    warrantyExpiry: formData.get('warrantyExpiry') || undefined,
    notes: formData.get('notes') || undefined,
  }

  const parsed = assetSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: 'Invalid input. Check all required fields.' }
  }

  const payload = {
    asset_tag: parsed.data.assetTag,
    assigned_user_id: normalizeOptionalValue(parsed.data.assignedUserId),
    brand: parsed.data.brand,
    category: parsed.data.type,
    model: parsed.data.model,
    notes: normalizeOptionalValue(parsed.data.notes),
    serial_number: normalizeOptionalValue(parsed.data.serialNumber),
    status: parsed.data.status,
    warranty_expiry: normalizeOptionalValue(parsed.data.warrantyExpiry),
  }

  const { data, error } = await supabase
    .from('assets')
    .update(payload)
    .eq('id', id)
    .select('id, asset_tag')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Unable to update the asset right now.' }
  }

  await logAudit({
    action: 'ASSET_UPDATED',
    detail: { assetTag: data.asset_tag, status: payload.status },
    entityId: data.id,
    entityType: 'asset',
    userId: user.id,
  })

  revalidateAssetViews(data.id)
  redirect(`/assets/${data.id}`)
}

export async function deleteAsset(id: string) {
  const user = await requireSupabaseAdmin(`/assets/${id}`)
  const supabase = createSupabaseServerClient()

  const { data: asset } = await supabase
    .from('assets')
    .select('id, asset_tag')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('assets').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  await logAudit({
    action: 'ASSET_DELETED',
    detail: { assetTag: asset?.asset_tag ?? id },
    entityId: id,
    entityType: 'asset',
    userId: user.id,
  })

  revalidateAssetViews(id)
  return { error: undefined }
}
