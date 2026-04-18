'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

type ActionState = { error?: string } | undefined

const STATUSES = ['IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'RETIRED'] as const

const assetSchema = z.object({
  assetTag:       z.string().min(1).max(50).trim(),
  type:           z.string().min(1).max(50).trim(),
  brand:          z.string().min(1).max(50).trim(),
  model:          z.string().min(1).max(100).trim(),
  serialNumber:   z.string().max(100).trim().optional(),
  status:         z.enum(STATUSES),
  assignedUserId: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes:          z.string().max(2000).trim().optional(),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}

export async function createAsset(_state: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin()

  const raw = {
    assetTag:       formData.get('assetTag'),
    type:           formData.get('type'),
    brand:          formData.get('brand'),
    model:          formData.get('model'),
    serialNumber:   formData.get('serialNumber') || undefined,
    status:         formData.get('status'),
    assignedUserId: formData.get('assignedUserId') || undefined,
    warrantyExpiry: formData.get('warrantyExpiry') || undefined,
    notes:          formData.get('notes') || undefined,
  }

  const parsed = assetSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid input. Check all required fields.' }

  const data = parsed.data
  const status = data.assignedUserId ? 'ASSIGNED' : data.status === 'ASSIGNED' ? 'IN_STOCK' : data.status

  try {
    await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          assetTag:       data.assetTag,
          type:           data.type,
          brand:          data.brand,
          model:          data.model,
          serialNumber:   data.serialNumber || null,
          status,
          assignedUserId: data.assignedUserId || null,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          notes:          data.notes || null,
        },
      })

      await logAudit({
        userId:     session.user.id,
        action:     'CREATE_ASSET',
        entityType: 'asset',
        entityId:   asset.id,
        detail:     `Created asset ${asset.assetTag}`,
      }, tx)
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint')) return { error: 'Asset tag already exists.' }
    return { error: 'Failed to create asset.' }
  }

  revalidatePath('/assets')
  redirect('/assets')
}

export async function updateAsset(id: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin()

  const raw = {
    assetTag:       formData.get('assetTag'),
    type:           formData.get('type'),
    brand:          formData.get('brand'),
    model:          formData.get('model'),
    serialNumber:   formData.get('serialNumber') || undefined,
    status:         formData.get('status'),
    assignedUserId: formData.get('assignedUserId') || undefined,
    warrantyExpiry: formData.get('warrantyExpiry') || undefined,
    notes:          formData.get('notes') || undefined,
  }

  const parsed = assetSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid input. Check all required fields.' }

  const data = parsed.data
  const status = data.assignedUserId ? 'ASSIGNED' : data.status === 'ASSIGNED' ? 'IN_STOCK' : data.status

  try {
    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: {
          assetTag:       data.assetTag,
          type:           data.type,
          brand:          data.brand,
          model:          data.model,
          serialNumber:   data.serialNumber || null,
          status,
          assignedUserId: data.assignedUserId || null,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          notes:          data.notes || null,
        },
      })

      await logAudit({
        userId:     session.user.id,
        action:     'EDIT_ASSET',
        entityType: 'asset',
        entityId:   id,
        detail:     `Updated asset ${data.assetTag}`,
      }, tx)
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint')) return { error: 'Asset tag already exists.' }
    return { error: 'Failed to update asset.' }
  }

  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  redirect(`/assets/${id}`)
}

export async function deleteAsset(id: string) {
  const session = await requireAdmin()

  await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id } })
    if (!asset) return

    await tx.asset.delete({ where: { id } })

    await logAudit({
      userId:     session.user.id,
      action:     'DELETE_ASSET',
      entityType: 'asset',
      entityId:   id,
      detail:     `Deleted asset ${asset.assetTag}`,
    }, tx)
  })

  revalidatePath('/assets')
  redirect('/assets')
}
