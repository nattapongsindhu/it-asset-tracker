'use server'
import { z } from 'zod'
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

export async function createAsset(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireSupabaseAdmin('/dashboard')

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

  // TODO: Implement Supabase insert for asset creation.
  return { error: 'TODO: Implement Supabase asset creation.' }
}

export async function updateAsset(id: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireSupabaseAdmin(`/assets/${id}`)

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

  // TODO: Implement Supabase update for asset editing.
  return { error: 'TODO: Implement Supabase asset update.' }
}

export async function deleteAsset(id: string) {
  await requireSupabaseAdmin(`/assets/${id}`)

  // TODO: Implement Supabase delete for asset removal.
  console.warn(`TODO: Implement Supabase delete for asset ${id}.`)
}
