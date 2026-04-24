'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'
import type { AssetStatus } from '@/types/app'

type ActionState = { error?: string } | undefined
export type BulkActionState = { error?: string; message?: string } | undefined
type SupabaseClient = ReturnType<typeof createSupabaseServerClient>

const STATUSES = ['IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'RETIRED'] as const
const BULK_STATUSES = ['IN_STOCK', 'IN_REPAIR', 'RETIRED'] as const

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
const bulkAssetSchema = z.object({
  assetIds: z.array(z.string().min(1)).min(1),
  status: z.enum(BULK_STATUSES),
})

type AssetFormInput = z.infer<typeof assetSchema>
type ProfileRow = {
  email: string | null
  id: string
}
type AssetSnapshot = {
  asset_tag: string | null
  assigned_user_id: string | null
  brand: string | null
  category: string | null
  model: string | null
  notes: string | null
  serial_number: string | null
  status: AssetStatus | null
  warranty_expiry: string | null
}
type AssetWritePayload = {
  asset_tag: string
  assigned_user_id: string | null
  brand: string
  category: string
  model: string
  name: string
  notes: string | null
  serial_number: string | null
  status: AssetStatus
  warranty_expiry: string | null
}
type BulkAssetRow = {
  asset_tag: string | null
  assigned_user_id: string | null
  id: string
  status: AssetStatus | null
}

function normalizeOptionalValue(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null
}

function normalizeDateValue(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : null
}

function buildAssetName(brand: string, model: string) {
  return `${brand} ${model}`.trim()
}

function buildStatus(
  requestedStatus: AssetStatus,
  previousAssignedUserId: string | null,
  nextAssignedUserId: string | null
): AssetStatus {
  if (nextAssignedUserId) {
    return 'ASSIGNED'
  }

  if (previousAssignedUserId && !nextAssignedUserId) {
    return 'IN_STOCK'
  }

  return requestedStatus === 'ASSIGNED' ? 'IN_STOCK' : requestedStatus
}

function formatProfileLabel(profile: ProfileRow | undefined, fallbackId?: string | null) {
  return profile?.email?.trim() || fallbackId || 'Unknown user'
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))
  )
}

async function loadProfilesById(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProfileRow>()
  }

  const { data, error } = await supabase.from('profiles').select('id, email').in('id', ids)

  if (error) {
    return null
  }

  return new Map((data ?? []).map(profile => [profile.id, profile]))
}

async function logAssignmentAuditChange({
  assetId,
  assetTag,
  bulk = false,
  nextAssignedUserId,
  nextStatus,
  previousAssignedUserId,
  previousStatus,
  profilesById,
  userId,
}: {
  assetId: string
  assetTag: string | null
  bulk?: boolean
  nextAssignedUserId: string | null
  nextStatus: AssetStatus
  previousAssignedUserId: string | null
  previousStatus: AssetStatus | null
  profilesById: Map<string, ProfileRow>
  userId: string
}) {
  if (previousAssignedUserId === nextAssignedUserId) {
    return
  }

  const baseDetail = {
    asset_tag: assetTag ?? assetId,
    status: nextStatus,
    ...(previousStatus ? { previous_status: previousStatus } : {}),
    ...(bulk ? { bulk: true } : {}),
  }

  if (!previousAssignedUserId && nextAssignedUserId) {
    await logAudit({
      action: 'ASSET_ASSIGNED',
      detail: {
        ...baseDetail,
        assigned_to: formatProfileLabel(profilesById.get(nextAssignedUserId), nextAssignedUserId),
        assigned_to_id: nextAssignedUserId,
      },
      entityId: assetId,
      entityType: 'asset',
      userId,
    })
    return
  }

  if (previousAssignedUserId && !nextAssignedUserId) {
    await logAudit({
      action: 'ASSET_UNASSIGNED',
      detail: {
        ...baseDetail,
        unassigned_from: formatProfileLabel(
          profilesById.get(previousAssignedUserId),
          previousAssignedUserId
        ),
        unassigned_from_id: previousAssignedUserId,
      },
      entityId: assetId,
      entityType: 'asset',
      userId,
    })
    return
  }

  if (previousAssignedUserId && nextAssignedUserId) {
    await logAudit({
      action: 'ASSET_REASSIGNED',
      detail: {
        ...baseDetail,
        from_user: formatProfileLabel(profilesById.get(previousAssignedUserId), previousAssignedUserId),
        from_user_id: previousAssignedUserId,
        to_user: formatProfileLabel(profilesById.get(nextAssignedUserId), nextAssignedUserId),
        to_user_id: nextAssignedUserId,
      },
      entityId: assetId,
      entityType: 'asset',
      userId,
    })
  }
}

async function logAssetUpdatedEvent({
  assetId,
  assetTag,
  bulk = false,
  changedFields,
  nextStatus,
  previousStatus,
  userId,
}: {
  assetId: string
  assetTag: string | null
  bulk?: boolean
  changedFields: string[]
  nextStatus: AssetStatus
  previousStatus: AssetStatus | null
  userId: string
}) {
  if (changedFields.length === 0) {
    return
  }

  await logAudit({
    action: 'ASSET_UPDATED',
    detail: {
      asset_tag: assetTag ?? assetId,
      changed_fields: changedFields,
      previous_status: previousStatus ?? 'IN_STOCK',
      status: nextStatus,
      ...(bulk ? { bulk: true } : {}),
    },
    entityId: assetId,
    entityType: 'asset',
    userId,
  })
}

function getChangedFields(previous: AssetSnapshot, next: AssetWritePayload) {
  const changedFields: string[] = []

  if ((previous.asset_tag ?? '') !== next.asset_tag) {
    changedFields.push('asset_tag')
  }

  if ((previous.category ?? '') !== next.category) {
    changedFields.push('type')
  }

  if ((previous.brand ?? '') !== next.brand) {
    changedFields.push('brand')
  }

  if ((previous.model ?? '') !== next.model) {
    changedFields.push('model')
  }

  if ((previous.serial_number ?? null) !== next.serial_number) {
    changedFields.push('serial_number')
  }

  if ((previous.notes ?? null) !== next.notes) {
    changedFields.push('notes')
  }

  if (normalizeDateValue(previous.warranty_expiry) !== normalizeDateValue(next.warranty_expiry)) {
    changedFields.push('warranty_expiry')
  }

  if ((previous.status ?? 'IN_STOCK') !== next.status) {
    changedFields.push('status')
  }

  if ((previous.assigned_user_id ?? null) !== next.assigned_user_id) {
    changedFields.push('assigned_to')
  }

  return changedFields
}

function buildAssetPayload(
  input: AssetFormInput,
  previousAssignedUserId: string | null
): AssetWritePayload {
  const nextAssignedUserId = normalizeOptionalValue(input.assignedUserId)

  return {
    asset_tag: input.assetTag,
    assigned_user_id: nextAssignedUserId,
    brand: input.brand,
    category: input.type,
    model: input.model,
    name: buildAssetName(input.brand, input.model),
    notes: normalizeOptionalValue(input.notes),
    serial_number: normalizeOptionalValue(input.serialNumber),
    status: buildStatus(input.status, previousAssignedUserId, nextAssignedUserId),
    warranty_expiry: normalizeOptionalValue(input.warrantyExpiry),
  }
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

  const payload = buildAssetPayload(parsed.data, null)
  const profilesById = await loadProfilesById(supabase, uniqueIds([payload.assigned_user_id]))

  if (!profilesById) {
    return { error: 'Unable to verify the assigned user right now.' }
  }

  if (payload.assigned_user_id && !profilesById.has(payload.assigned_user_id)) {
    return { error: 'Assigned user was not found in employee profiles.' }
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({
      ...payload,
      created_by: user.id,
    })
    .select('id, asset_tag')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Unable to create the asset right now.' }
  }

  await logAudit({
    action: 'ASSET_CREATED',
    detail: { asset_tag: data.asset_tag, status: payload.status },
    entityId: data.id,
    entityType: 'asset',
    userId: user.id,
  })

  await logAssignmentAuditChange({
    assetId: data.id,
    assetTag: data.asset_tag,
    nextAssignedUserId: payload.assigned_user_id,
    nextStatus: payload.status,
    previousAssignedUserId: null,
    previousStatus: null,
    profilesById,
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

  const { data: currentAsset, error: currentAssetError } = await supabase
    .from('assets')
    .select(
      'asset_tag, assigned_user_id, brand, category, model, notes, serial_number, status, warranty_expiry'
    )
    .eq('id', id)
    .maybeSingle()

  if (currentAssetError) {
    return { error: currentAssetError.message ?? 'Unable to load the asset right now.' }
  }

  if (!currentAsset) {
    return { error: 'Asset not found.' }
  }

  const payload = buildAssetPayload(parsed.data, currentAsset.assigned_user_id)
  const profilesById = await loadProfilesById(
    supabase,
    uniqueIds([currentAsset.assigned_user_id, payload.assigned_user_id])
  )

  if (!profilesById) {
    return { error: 'Unable to verify the assigned user right now.' }
  }

  if (payload.assigned_user_id && !profilesById.has(payload.assigned_user_id)) {
    return { error: 'Assigned user was not found in employee profiles.' }
  }

  const changedFields = getChangedFields(currentAsset, payload)

  if (changedFields.length === 0) {
    redirect(`/assets/${id}`)
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

  const assignmentChanged = currentAsset.assigned_user_id !== payload.assigned_user_id

  if (assignmentChanged) {
    await logAssignmentAuditChange({
      assetId: data.id,
      assetTag: data.asset_tag,
      nextAssignedUserId: payload.assigned_user_id,
      nextStatus: payload.status,
      previousAssignedUserId: currentAsset.assigned_user_id,
      previousStatus: currentAsset.status,
      profilesById,
      userId: user.id,
    })
  }

  const nonAssignmentChanges = changedFields.filter(
    field => field !== 'assigned_to' && !(field === 'status' && assignmentChanged)
  )

  await logAssetUpdatedEvent({
    assetId: data.id,
    assetTag: data.asset_tag,
    changedFields: nonAssignmentChanges,
    nextStatus: payload.status,
    previousStatus: currentAsset.status,
    userId: user.id,
  })

  revalidateAssetViews(data.id)
  redirect(`/assets/${data.id}`)
}

export async function bulkUpdateAssetStatus(
  _state: BulkActionState,
  formData: FormData
): Promise<BulkActionState> {
  const user = await requireSupabaseAdmin('/dashboard/assets')
  const supabase = createSupabaseServerClient()

  const raw = {
    assetIds: uniqueIds(
      formData.getAll('assetIds').map(value => (typeof value === 'string' ? value : ''))
    ),
    status: formData.get('status'),
  }

  const parsed = bulkAssetSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: 'Select at least one asset and a valid bulk action.' }
  }

  const { data: currentAssets, error: currentAssetsError } = await supabase
    .from('assets')
    .select('id, asset_tag, assigned_user_id, status')
    .in('id', parsed.data.assetIds)

  if (currentAssetsError) {
    return { error: currentAssetsError.message ?? 'Unable to load the selected assets right now.' }
  }

  const assetsToUpdate = (currentAssets ?? []).filter(
    asset =>
      asset.assigned_user_id !== null || (asset.status ?? 'IN_STOCK') !== parsed.data.status
  ) as BulkAssetRow[]

  if (assetsToUpdate.length === 0) {
    return { message: 'Selected assets already match the requested status.' }
  }

  const profilesById = await loadProfilesById(
    supabase,
    uniqueIds(assetsToUpdate.map(asset => asset.assigned_user_id))
  )

  if (!profilesById) {
    return { error: 'Unable to load assigned employee profiles right now.' }
  }

  const { error: updateError } = await supabase
    .from('assets')
    .update({
      assigned_user_id: null,
      status: parsed.data.status,
    })
    .in(
      'id',
      assetsToUpdate.map(asset => asset.id)
    )

  if (updateError) {
    return { error: updateError.message ?? 'Unable to apply the bulk action right now.' }
  }

  for (const asset of assetsToUpdate) {
    await logAssignmentAuditChange({
      assetId: asset.id,
      assetTag: asset.asset_tag,
      bulk: true,
      nextAssignedUserId: null,
      nextStatus: parsed.data.status,
      previousAssignedUserId: asset.assigned_user_id,
      previousStatus: asset.status,
      profilesById,
      userId: user.id,
    })

    const changedFields = [
      ...(asset.assigned_user_id ? ['assigned_to'] : []),
      ...((asset.status ?? 'IN_STOCK') !== parsed.data.status ? ['status'] : []),
    ]

    await logAssetUpdatedEvent({
      assetId: asset.id,
      assetTag: asset.asset_tag,
      bulk: true,
      changedFields: changedFields.filter(field => field !== 'assigned_to'),
      nextStatus: parsed.data.status,
      previousStatus: asset.status,
      userId: user.id,
    })
  }

  revalidateAssetViews()
  return {
    message: `Updated ${assetsToUpdate.length} asset${assetsToUpdate.length === 1 ? '' : 's'}.`,
  }
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
    detail: { asset_tag: asset?.asset_tag ?? id },
    entityId: id,
    entityType: 'asset',
    userId: user.id,
  })

  revalidateAssetViews(id)
  return { error: undefined }
}
