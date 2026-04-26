'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { formatLocationLabel, type AssetLocationRow } from '@/lib/locations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin, requireSupabaseUser } from '@/lib/supabase/session'
import type { AssetStatus } from '@/types/app'

type ActionState = { error?: string } | undefined
export type BulkActionState = { error?: string; message?: string } | undefined
export type AssignmentActionState = { error?: string; message?: string } | undefined
export type LocationActionState = { error?: string; message?: string } | undefined
export type LifecycleActionState = { error?: string; message?: string } | undefined
export type MaintenanceActionState = { error?: string; message?: string } | undefined
export type RepairRequestActionState = { error?: string; message?: string } | undefined
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
  locationId: z.string().optional(),
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

const updateAssetLocationSchema = z.object({
  locationId: z.string().optional(),
})

const maintenanceLogSchema = z.object({
  actionTaken: z.string().min(1).max(200).trim(),
  technicianName: z.string().max(120).trim().optional(),
  cost: z.preprocess(value => {
    if (typeof value !== 'string') {
      return undefined
    }

    const trimmed = value.trim()

    if (!trimmed) {
      return undefined
    }

    const parsed = Number(trimmed)

    return Number.isFinite(parsed) ? parsed : value
  }, z.number().min(0).max(1000000).optional()),
  notes: z.string().max(2000).trim().optional(),
})

type AssetFormInput = z.infer<typeof assetSchema>
type MaintenanceLogInput = z.infer<typeof maintenanceLogSchema>
type ProfileRow = {
  email: string | null
  id: string
}
type AssetSnapshot = {
  asset_tag: string | null
  assigned_user_id: string | null
  brand: string | null
  category: string | null
  location_id: string | null
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
  location_id: string | null
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
type AssetRpcResult = {
  action?: string | null
  asset_id?: string | null
  assignment_id?: string | null
  maintenance_log_id?: string | null
  previous_user_id?: string | null
  status?: AssetStatus | null
  user_id?: string | null
}

type LifecycleRpcName =
  | 'complete_asset_repair'
  | 'decommission_asset'
  | 'move_asset_to_repair'
  | 'return_asset_to_stock'

type MaintenanceRpcName = 'log_asset_maintenance' | 'send_to_repair_v2'

type LifecycleTransition = 'COMPLETE_REPAIR' | 'DECOMMISSION' | 'SEND_TO_REPAIR' | 'TERMINAL_LOCK'

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
    return 'Unable to complete this asset workflow right now.'
  }

  if (message.includes('Could not find the function')) {
    return 'Required Supabase migration is not applied yet.'
  }

  if (message.includes('ACTOR_NOT_ADMIN')) {
    return 'Only admins can run this asset workflow.'
  }

  if (message.includes('ASSET_NOT_FOUND')) {
    return 'Asset not found.'
  }

  if (message.includes('PROFILE_NOT_FOUND')) {
    return 'Assigned user was not found in employee profiles.'
  }

  if (message.includes('ASSET_NOT_ASSIGNABLE')) {
    return 'Only in-stock assets can move into the In Use workflow.'
  }

  if (message.includes('ASSET_ALREADY_RETIRED')) {
    return 'Retired assets are locked from active lifecycle actions.'
  }

  if (message.includes('ASSET_NOT_IN_REPAIR')) {
    return 'Maintenance logs can only be added while the asset is in the Under Repair workflow.'
  }

  if (message.includes('INVALID_MAINTENANCE_ACTION')) {
    return 'Add a short maintenance action summary before saving this repair entry.'
  }

  if (message.includes('INVALID_MAINTENANCE_COST')) {
    return 'Maintenance cost must be zero or greater.'
  }

  return message
}

function parseAssetRpcResult(data: unknown): AssetRpcResult | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }

  return data as AssetRpcResult
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

async function loadLocationsById(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, AssetLocationRow>()
  }

  const { data, error } = await supabase.from('locations').select('id, name, building, floor').in('id', ids)

  if (error) {
    return null
  }

  return new Map((data ?? []).map(location => [location.id, location]))
}

function getLocationLabelById(
  locationsById: Map<string, AssetLocationRow>,
  locationId: string | null,
  fallback = 'No location set'
) {
  if (!locationId) {
    return fallback
  }

  return formatLocationLabel(locationsById.get(locationId), fallback)
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

  return { data: parseAssetRpcResult(data), error: undefined }
}

async function invokeLifecycleRpc({
  assetId,
  rpcName,
  supabase,
  userId,
}: {
  assetId: string
  rpcName: LifecycleRpcName
  supabase: SupabaseClient
  userId: string
}) {
  const { data, error } = await supabase.rpc(rpcName, {
    p_actor_id: userId,
    p_asset_id: assetId,
  })

  if (error) {
    return { data: null, error: mapRpcError(error.message) }
  }

  return { data: parseAssetRpcResult(data), error: undefined }
}

async function invokeMaintenanceRpc({
  assetId,
  input,
  rpcName,
  supabase,
  userId,
}: {
  assetId: string
  input: MaintenanceLogInput
  rpcName: MaintenanceRpcName
  supabase: SupabaseClient
  userId: string
}) {
  const { data, error } = await supabase.rpc(rpcName, {
    p_action_taken: input.actionTaken,
    p_actor_id: userId,
    p_asset_id: assetId,
    p_cost: input.cost ?? null,
    p_notes: normalizeOptionalValue(input.notes),
    p_technician_name: normalizeOptionalValue(input.technicianName),
  })

  if (error) {
    return { data: null, error: mapRpcError(error.message) }
  }

  return { data: parseAssetRpcResult(data), error: undefined }
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

async function logAssetMovedEvent({
  assetId,
  assetTag,
  nextLocationId,
  previousLocationId,
  locationsById,
  userId,
}: {
  assetId: string
  assetTag: string | null
  nextLocationId: string | null
  previousLocationId: string | null
  locationsById: Map<string, AssetLocationRow>
  userId: string
}) {
  if (previousLocationId === nextLocationId) {
    return
  }

  await logAudit({
    action: 'ASSET_MOVED',
    detail: {
      asset_tag: assetTag ?? assetId,
      from_location: getLocationLabelById(locationsById, previousLocationId),
      from_location_id: previousLocationId,
      to_location: getLocationLabelById(locationsById, nextLocationId),
      to_location_id: nextLocationId,
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

  if ((previous.location_id ?? null) !== next.location_id) {
    changedFields.push('location')
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
    location_id: normalizeOptionalValue(input.locationId),
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
    location_id: normalizeOptionalValue(input.locationId),
    model: input.model,
    name: buildAssetName(input.brand, input.model),
    notes: normalizeOptionalValue(input.notes),
    serial_number: normalizeOptionalValue(input.serialNumber),
    status: currentAssignedUserId ? 'ASSIGNED' : buildManualStatus(input.status),
    warranty_expiry: normalizeOptionalValue(input.warrantyExpiry),
  }
}

function getLifecycleTransition(
  previousStatus: AssetStatus,
  nextStatus: AssetStatus
): LifecycleTransition | null {
  if (previousStatus === nextStatus) {
    return null
  }

  if (previousStatus === 'RETIRED' && nextStatus !== 'RETIRED') {
    return 'TERMINAL_LOCK'
  }

  if (nextStatus === 'IN_REPAIR') {
    return 'SEND_TO_REPAIR'
  }

  if (nextStatus === 'RETIRED') {
    return 'DECOMMISSION'
  }

  if (previousStatus === 'IN_REPAIR' && nextStatus === 'IN_STOCK') {
    return 'COMPLETE_REPAIR'
  }

  return null
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
    locationId: formData.get('locationId') || undefined,
    warrantyExpiry: formData.get('warrantyExpiry') || undefined,
    notes: formData.get('notes') || undefined,
  }

  const parsed = assetSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: 'Invalid input. Check all required fields.' }
  }

  const finalPayload = buildFinalAssetPayload(parsed.data, null)
  const desiredAssignedUserId = finalPayload.assigned_user_id
  const desiredLocationId = finalPayload.location_id
  const profilesById = await loadProfilesById(supabase, uniqueIds([desiredAssignedUserId]))
  const locationsById = await loadLocationsById(supabase, uniqueIds([desiredLocationId]))

  if (!profilesById) {
    return { error: 'Unable to verify the assigned user right now.' }
  }

  if (!locationsById) {
    return { error: 'Unable to verify the selected location right now.' }
  }

  if (desiredAssignedUserId && !profilesById.has(desiredAssignedUserId)) {
    return { error: 'Assigned user was not found in employee profiles.' }
  }

  if (desiredLocationId && !locationsById.has(desiredLocationId)) {
    return { error: 'Selected location was not found.' }
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
    detail: {
      asset_tag: data.asset_tag,
      location: getLocationLabelById(locationsById, desiredLocationId),
      status: finalPayload.status,
    },
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
    locationId: formData.get('locationId') || undefined,
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
      'asset_tag, assigned_user_id, brand, category, location_id, model, notes, serial_number, status, warranty_expiry'
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
  const desiredLocationId = finalPayload.location_id
  const currentStatus = currentAsset.status ?? 'IN_STOCK'
  const profilesById = await loadProfilesById(supabase, uniqueIds([desiredAssignedUserId]))
  const locationsById = await loadLocationsById(
    supabase,
    uniqueIds([currentAsset.location_id, desiredLocationId])
  )

  if (!profilesById) {
    return { error: 'Unable to verify the assigned user right now.' }
  }

  if (!locationsById) {
    return { error: 'Unable to verify the selected location right now.' }
  }

  if (desiredAssignedUserId && !profilesById.has(desiredAssignedUserId)) {
    return { error: 'Assigned user was not found in employee profiles.' }
  }

  if (desiredLocationId && !locationsById.has(desiredLocationId)) {
    return { error: 'Selected location was not found.' }
  }

  const changedFields = getChangedFields(currentAsset, finalPayload)

  if (changedFields.length === 0) {
    redirect(`/assets/${id}`)
  }

  const assignmentChanged = currentAsset.assigned_user_id !== finalPayload.assigned_user_id
  const locationChanged = currentAsset.location_id !== finalPayload.location_id
  const lifecycleTransition = assignmentChanged
    ? null
    : getLifecycleTransition(currentStatus, finalPayload.status)

  if (lifecycleTransition === 'TERMINAL_LOCK') {
    return { error: 'Retired assets stay archived. Create a replacement record instead of reactivating this one.' }
  }

  const genericChangedFields = changedFields.filter(
    field =>
      field !== 'assigned_to' &&
      field !== 'location' &&
      !(field === 'status' && (assignmentChanged || lifecycleTransition !== null))
  )

  const directPayload = buildDirectAssetPayload(parsed.data, currentAsset.assigned_user_id)

  if (lifecycleTransition) {
    directPayload.status = currentStatus
  }

  const shouldWriteDirectUpdate = genericChangedFields.length > 0 || locationChanged

  if (shouldWriteDirectUpdate) {
    const { error } = await supabase
      .from('assets')
      .update({
        ...directPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return { error: error.message ?? 'Unable to update the asset right now.' }
    }
  }

  if (locationChanged) {
    await logAssetMovedEvent({
      assetId: id,
      assetTag: finalPayload.asset_tag,
      locationsById,
      nextLocationId: finalPayload.location_id,
      previousLocationId: currentAsset.location_id,
      userId: user.id,
    })
  }

  if (assignmentChanged) {
    const rpcResult = desiredAssignedUserId
      ? await invokeAssignAssetRpc({
          assetId: id,
          assignedUserId: desiredAssignedUserId,
          supabase,
          userId: user.id,
        })
      : await invokeLifecycleRpc({
          assetId: id,
          rpcName: 'return_asset_to_stock',
          supabase,
          userId: user.id,
        })

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }
  }

  if (lifecycleTransition) {
    const rpcName: LifecycleRpcName =
      lifecycleTransition === 'SEND_TO_REPAIR'
        ? 'move_asset_to_repair'
        : lifecycleTransition === 'COMPLETE_REPAIR'
          ? 'complete_asset_repair'
          : 'decommission_asset'

    const rpcResult = await invokeLifecycleRpc({
      assetId: id,
      rpcName,
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
    changedFields: genericChangedFields,
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
  const rpcResult = await invokeLifecycleRpc({
    assetId,
    rpcName: 'return_asset_to_stock',
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

export async function updateAssetLocation(
  assetId: string,
  _state: LocationActionState,
  formData: FormData
): Promise<LocationActionState> {
  const user = await requireSupabaseAdmin(`/assets/${assetId}`)
  const supabase = createSupabaseServerClient()
  const parsed = updateAssetLocationSchema.safeParse({
    locationId: formData.get('locationId') || undefined,
  })

  if (!parsed.success) {
    return { error: 'Invalid location selection.' }
  }

  const nextLocationId = normalizeOptionalValue(parsed.data.locationId)
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('asset_tag, location_id')
    .eq('id', assetId)
    .maybeSingle()

  if (assetError) {
    return { error: assetError.message ?? 'Unable to load the asset right now.' }
  }

  if (!asset) {
    return { error: 'Asset not found.' }
  }

  const locationsById = await loadLocationsById(supabase, uniqueIds([asset.location_id, nextLocationId]))

  if (!locationsById) {
    return { error: 'Unable to verify the selected location right now.' }
  }

  if (nextLocationId && !locationsById.has(nextLocationId)) {
    return { error: 'Selected location was not found.' }
  }

  if (asset.location_id === nextLocationId) {
    return { message: 'Location already matches the selected destination.' }
  }

  const { error: updateError } = await supabase
    .from('assets')
    .update({
      location_id: nextLocationId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)

  if (updateError) {
    return { error: updateError.message ?? 'Unable to move the asset right now.' }
  }

  await logAssetMovedEvent({
    assetId,
    assetTag: asset.asset_tag,
    locationsById,
    nextLocationId,
    previousLocationId: asset.location_id,
    userId: user.id,
  })

  revalidateAssetViews(assetId)
  return {
    message: `Asset moved to ${getLocationLabelById(locationsById, nextLocationId)}.`,
  }
}

export async function sendAssetToRepair(
  assetId: string,
  _state: LifecycleActionState,
  formData: FormData
): Promise<LifecycleActionState> {
  const user = await requireSupabaseAdmin(`/assets/${assetId}`)
  const supabase = createSupabaseServerClient()
  const parsed = maintenanceLogSchema.safeParse({
    actionTaken: formData.get('actionTaken'),
    technicianName: formData.get('technicianName') || undefined,
    cost: formData.get('cost') || undefined,
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { error: 'Add a maintenance action summary before sending this asset to repair.' }
  }

  const rpcResult = await invokeMaintenanceRpc({
    assetId,
    input: parsed.data,
    rpcName: 'send_to_repair_v2',
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
        ? 'This asset is already in the repair workflow.'
        : 'Asset moved into the Under Repair workflow and the first maintenance entry was saved.',
  }
}

export async function logMaintenanceEntry(
  assetId: string,
  _state: MaintenanceActionState,
  formData: FormData
): Promise<MaintenanceActionState> {
  const user = await requireSupabaseAdmin(`/assets/${assetId}`)
  const supabase = createSupabaseServerClient()
  const parsed = maintenanceLogSchema.safeParse({
    actionTaken: formData.get('actionTaken'),
    technicianName: formData.get('technicianName') || undefined,
    cost: formData.get('cost') || undefined,
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { error: 'Add a maintenance action summary before saving this repair log.' }
  }

  const rpcResult = await invokeMaintenanceRpc({
    assetId,
    input: parsed.data,
    rpcName: 'log_asset_maintenance',
    supabase,
    userId: user.id,
  })

  if (rpcResult.error) {
    return { error: rpcResult.error }
  }

  revalidateAssetViews(assetId)
  return { message: 'Maintenance log saved.' }
}

export async function completeAssetRepair(
  assetId: string,
  _state: LifecycleActionState,
  _formData: FormData
): Promise<LifecycleActionState> {
  void _state
  void _formData

  const user = await requireSupabaseAdmin(`/assets/${assetId}`)
  const supabase = createSupabaseServerClient()
  const rpcResult = await invokeLifecycleRpc({
    assetId,
    rpcName: 'complete_asset_repair',
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
        ? 'This asset is already back in stock.'
        : 'Repair workflow closed and asset returned to stock.',
  }
}

export async function decommissionAsset(
  assetId: string,
  _state: LifecycleActionState,
  _formData: FormData
): Promise<LifecycleActionState> {
  void _state
  void _formData

  const user = await requireSupabaseAdmin(`/assets/${assetId}`)
  const supabase = createSupabaseServerClient()
  const rpcResult = await invokeLifecycleRpc({
    assetId,
    rpcName: 'decommission_asset',
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
        ? 'This asset is already retired.'
        : 'Asset decommissioned and archived for audit history.',
  }
}

export async function requestRepair(
  assetId: string,
  _state: RepairRequestActionState,
  _formData: FormData
): Promise<RepairRequestActionState> {
  void _state
  void _formData

  const user = await requireSupabaseUser()
  const supabase = createSupabaseServerClient()
  const { data: asset, error } = await supabase
    .from('assets')
    .select('id, asset_tag, assigned_user_id, status')
    .eq('id', assetId)
    .maybeSingle()

  if (error) {
    return { error: error.message ?? 'Unable to load the asset right now.' }
  }

  if (!asset) {
    return { error: 'Asset not found.' }
  }

  if (asset.assigned_user_id !== user.id) {
    return { error: 'You can only request repair for assets assigned to your account.' }
  }

  if (asset.status !== 'ASSIGNED') {
    return { error: 'Only assets that are currently in use can request repair.' }
  }

  await logAudit({
    action: 'ASSET_REPAIR_REQUESTED',
    detail: {
      asset_tag: asset.asset_tag ?? asset.id,
      requested_by: user.email,
      requested_by_id: user.id,
      status: asset.status,
    },
    entityId: asset.id,
    entityType: 'asset',
    userId: user.id,
  })

  revalidateAssetViews(assetId)
  return {
    message: 'Repair request sent. An admin can now move this asset into the repair workflow.',
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

  const assetsToProcess = (currentAssets ?? []) as BulkAssetRow[]

  if (assetsToProcess.length === 0) {
    return { error: 'No matching assets were found for this bulk action.' }
  }

  let updatedCount = 0
  let skippedCount = 0

  for (const asset of assetsToProcess) {
    const currentStatus = asset.status ?? 'IN_STOCK'

    if (parsed.data.status === 'IN_REPAIR') {
      if (currentStatus === 'IN_REPAIR' || currentStatus === 'RETIRED') {
        skippedCount += 1
        continue
      }

      const rpcResult = await invokeLifecycleRpc({
        assetId: asset.id,
        rpcName: 'move_asset_to_repair',
        supabase,
        userId: user.id,
      })

      if (rpcResult.error) {
        return { error: rpcResult.error }
      }

      updatedCount += rpcResult.data?.action === 'UNCHANGED' ? 0 : 1
      skippedCount += rpcResult.data?.action === 'UNCHANGED' ? 1 : 0
      continue
    }

    if (parsed.data.status === 'RETIRED') {
      if (currentStatus === 'RETIRED') {
        skippedCount += 1
        continue
      }

      const rpcResult = await invokeLifecycleRpc({
        assetId: asset.id,
        rpcName: 'decommission_asset',
        supabase,
        userId: user.id,
      })

      if (rpcResult.error) {
        return { error: rpcResult.error }
      }

      updatedCount += rpcResult.data?.action === 'UNCHANGED' ? 0 : 1
      skippedCount += rpcResult.data?.action === 'UNCHANGED' ? 1 : 0
      continue
    }

    if (currentStatus === 'RETIRED') {
      skippedCount += 1
      continue
    }

    const rpcResult = asset.assigned_user_id
      ? await invokeLifecycleRpc({
          assetId: asset.id,
          rpcName: 'return_asset_to_stock',
          supabase,
          userId: user.id,
        })
      : currentStatus === 'IN_REPAIR'
        ? await invokeLifecycleRpc({
            assetId: asset.id,
            rpcName: 'complete_asset_repair',
            supabase,
            userId: user.id,
          })
        : { data: { action: 'UNCHANGED' }, error: undefined }

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }

    updatedCount += rpcResult.data?.action === 'UNCHANGED' ? 0 : 1
    skippedCount += rpcResult.data?.action === 'UNCHANGED' ? 1 : 0
  }

  revalidateAssetViews()

  if (updatedCount === 0) {
    return { message: 'Selected assets already match the requested lifecycle state.' }
  }

  return {
    message:
      skippedCount > 0
        ? `Updated ${updatedCount} asset${updatedCount === 1 ? '' : 's'} and skipped ${skippedCount}.`
        : `Updated ${updatedCount} asset${updatedCount === 1 ? '' : 's'}.`,
  }
}

export async function deleteAsset(id: string) {
  const user = await requireSupabaseAdmin(`/assets/${id}`)
  const supabase = createSupabaseServerClient()

  const { data: asset } = await supabase
    .from('assets')
    .select('id, asset_tag, assigned_user_id')
    .eq('id', id)
    .maybeSingle()

  if (asset?.assigned_user_id) {
    const rpcResult = await invokeLifecycleRpc({
      assetId: id,
      rpcName: 'return_asset_to_stock',
      supabase,
      userId: user.id,
    })

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }
  }

  const { error } = await supabase.from('assets').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  await logAudit({
    action: 'ASSET_DELETED',
    detail: {
      asset_tag: asset?.asset_tag ?? id,
      assignment_history_preserved: true,
    },
    entityId: id,
    entityType: 'asset',
    userId: user.id,
  })

  revalidateAssetViews(id)
  return { error: undefined }
}
