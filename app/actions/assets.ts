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
export type AssignmentActionState = { error?: string; message?: string } | undefined
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

const assignAssetSchema = z.object({
  assignedUserId: z.string().min(1).trim(),
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
type AssignmentRpcResult = {
  action?: string | null
  asset_id?: string | null
  assignment_id?: string | null
  previous_user_id?: string | null
  status?: AssetStatus | null
  user_id?: string | null
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

function buildManualStatus(requestedStatus: AssetStatus): AssetStatus {
  return requestedStatus === 'ASSIGNED' ? 'IN_STOCK' : requestedStatus
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

  return buildManualStatus(requestedStatus)
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))
  )
}

function mapRpcError(message: string | undefined) {
  if (!message) {
    return 'Unable to complete the assignment workflow right now.'
  }

  if (message.includes('Could not find the function')) {
    return 'Phase 2 assignment migration is not applied in Supabase yet.'
  }

  if (message.includes('ACTOR_NOT_ADMIN')) {
    return 'Only admins can manage asset assignment.'
  }

  if (message.includes('ASSET_NOT_FOUND')) {
    return 'Asset not found.'
  }

  if (message.includes('PROFILE_NOT_FOUND')) {
    return 'Assigned user was not found in employee profiles.'
  }

  if (message.includes('ASSET_NOT_ASSIGNABLE')) {
    return 'Only in-stock assets can move into the In Use assignment workflow.'
  }

  return message
}

function parseAssignmentRpcResult(data: unknown): AssignmentRpcResult | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }

  return data as AssignmentRpcResult
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

async function invokeAssignAssetRpc({
  assetId,
  assignedUserId,
  supabase,
  userId,
}: {
  assetId: string
  assignedUserId: string
  supabase: SupabaseClient
  userId: string
}) {
  const { data, error } = await supabase.rpc('assign_asset_to_user', {
    p_actor_id: userId,
    p_asset_id: assetId,
    p_user_id: assignedUserId,
  })

  if (error) {
    return { data: null, error: mapRpcError(error.message) }
  }

  return { data: parseAssignmentRpcResult(data), error: undefined }
}

async function invokeReturnAssetRpc({
  assetId,
  supabase,
  userId,
}: {
  assetId: string
  supabase: SupabaseClient
  userId: string
}) {
  const { data, error } = await supabase.rpc('return_asset_to_stock', {
    p_actor_id: userId,
    p_asset_id: assetId,
  })

  if (error) {
    return { data: null, error: mapRpcError(error.message) }
  }

  return { data: parseAssignmentRpcResult(data), error: undefined }
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

function buildFinalAssetPayload(
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

function buildDirectAssetPayload(
  input: AssetFormInput,
  currentAssignedUserId: string | null
): AssetWritePayload {
  return {
    asset_tag: input.assetTag,
    assigned_user_id: currentAssignedUserId,
    brand: input.brand,
    category: input.type,
    model: input.model,
    name: buildAssetName(input.brand, input.model),
    notes: normalizeOptionalValue(input.notes),
    serial_number: normalizeOptionalValue(input.serialNumber),
    status: currentAssignedUserId ? 'ASSIGNED' : buildManualStatus(input.status),
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

  const finalPayload = buildFinalAssetPayload(parsed.data, null)
  const desiredAssignedUserId = finalPayload.assigned_user_id
  const profilesById = await loadProfilesById(supabase, uniqueIds([desiredAssignedUserId]))

  if (!profilesById) {
    return { error: 'Unable to verify the assigned user right now.' }
  }

  if (desiredAssignedUserId && !profilesById.has(desiredAssignedUserId)) {
    return { error: 'Assigned user was not found in employee profiles.' }
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({
      ...buildDirectAssetPayload(parsed.data, null),
      created_by: user.id,
    })
    .select('id, asset_tag')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Unable to create the asset right now.' }
  }

  if (desiredAssignedUserId) {
    const rpcResult = await invokeAssignAssetRpc({
      assetId: data.id,
      assignedUserId: desiredAssignedUserId,
      supabase,
      userId: user.id,
    })

    if (rpcResult.error) {
      await supabase.from('assets').delete().eq('id', data.id)
      return { error: rpcResult.error }
    }
  }

  await logAudit({
    action: 'ASSET_CREATED',
    detail: { asset_tag: data.asset_tag, status: finalPayload.status },
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

  const finalPayload = buildFinalAssetPayload(parsed.data, currentAsset.assigned_user_id)
  const desiredAssignedUserId = finalPayload.assigned_user_id
  const profilesById = await loadProfilesById(supabase, uniqueIds([desiredAssignedUserId]))

  if (!profilesById) {
    return { error: 'Unable to verify the assigned user right now.' }
  }

  if (desiredAssignedUserId && !profilesById.has(desiredAssignedUserId)) {
    return { error: 'Assigned user was not found in employee profiles.' }
  }

  const changedFields = getChangedFields(currentAsset, finalPayload)

  if (changedFields.length === 0) {
    redirect(`/assets/${id}`)
  }

  const assignmentChanged = currentAsset.assigned_user_id !== finalPayload.assigned_user_id
  const nonAssignmentChanges = changedFields.filter(
    field => field !== 'assigned_to' && !(field === 'status' && assignmentChanged)
  )

  if (nonAssignmentChanges.length > 0) {
    const { error } = await supabase
      .from('assets')
      .update(buildDirectAssetPayload(parsed.data, currentAsset.assigned_user_id))
      .eq('id', id)

    if (error) {
      return { error: error.message ?? 'Unable to update the asset right now.' }
    }
  }

  if (assignmentChanged) {
    const rpcResult = desiredAssignedUserId
      ? await invokeAssignAssetRpc({
          assetId: id,
          assignedUserId: desiredAssignedUserId,
          supabase,
          userId: user.id,
        })
      : await invokeReturnAssetRpc({
          assetId: id,
          supabase,
          userId: user.id,
        })

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }
  }

  await logAssetUpdatedEvent({
    assetId: id,
    assetTag: finalPayload.asset_tag,
    changedFields: nonAssignmentChanges,
    nextStatus: finalPayload.status,
    previousStatus: currentAsset.status,
    userId: user.id,
  })

  revalidateAssetViews(id)
  redirect(`/assets/${id}`)
}

export async function assignAssetToUser(
  assetId: string,
  _state: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  const user = await requireSupabaseAdmin(`/assets/${assetId}`)
  const supabase = createSupabaseServerClient()
  const raw = {
    assignedUserId: formData.get('assignedUserId'),
  }
  const parsed = assignAssetSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: 'Please select an employee before assigning the asset.' }
  }

  const assignedUserId = parsed.data.assignedUserId.trim()
  const profilesById = await loadProfilesById(supabase, uniqueIds([assignedUserId]))

  if (!profilesById) {
    return { error: 'Unable to verify the assigned user right now.' }
  }

  if (!profilesById.has(assignedUserId)) {
    return { error: 'Assigned user was not found in employee profiles.' }
  }

  const rpcResult = await invokeAssignAssetRpc({
    assetId,
    assignedUserId,
    supabase,
    userId: user.id,
  })

  if (rpcResult.error) {
    return { error: rpcResult.error }
  }

  revalidateAssetViews(assetId)
  return {
    message:
      rpcResult.data?.action === 'ASSET_REASSIGNED'
        ? 'Asset reassigned successfully.'
        : rpcResult.data?.action === 'UNCHANGED'
          ? 'This asset is already assigned to that employee.'
          : 'Asset moved to the In Use workflow successfully.',
  }
}

export async function returnAssetToStock(
  assetId: string,
  _state: AssignmentActionState,
  _formData: FormData
): Promise<AssignmentActionState> {
  void _state
  void _formData

  const user = await requireSupabaseAdmin(`/assets/${assetId}`)
  const supabase = createSupabaseServerClient()
  const rpcResult = await invokeReturnAssetRpc({
    assetId,
    supabase,
    userId: user.id,
  })

  if (rpcResult.error) {
    return { error: rpcResult.error }
  }

  revalidateAssetViews(assetId)
  return {
    message:
      rpcResult.data?.action === 'UNCHANGED'
        ? 'This asset is already out of the assignment workflow.'
        : 'Asset returned to stock successfully.',
  }
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

  for (const asset of assetsToUpdate) {
    if (!asset.assigned_user_id) {
      continue
    }

    const rpcResult = await invokeReturnAssetRpc({
      assetId: asset.id,
      supabase,
      userId: user.id,
    })

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }
  }

  const statusUpdateIds = assetsToUpdate
    .filter(asset => {
      const currentStatus = asset.status ?? 'IN_STOCK'

      if (parsed.data.status === 'IN_STOCK') {
        return asset.assigned_user_id === null && currentStatus !== 'IN_STOCK'
      }

      return currentStatus !== parsed.data.status || asset.assigned_user_id !== null
    })
    .map(asset => asset.id)

  if (statusUpdateIds.length > 0) {
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        status: parsed.data.status,
      })
      .in('id', statusUpdateIds)

    if (updateError) {
      return { error: updateError.message ?? 'Unable to apply the bulk action right now.' }
    }
  }

  for (const asset of assetsToUpdate) {
    const changedFields =
      (asset.status ?? 'IN_STOCK') !== parsed.data.status ? ['status'] : []

    await logAssetUpdatedEvent({
      assetId: asset.id,
      assetTag: asset.asset_tag,
      bulk: true,
      changedFields,
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
