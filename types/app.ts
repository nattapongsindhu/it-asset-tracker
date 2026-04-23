export type AppRole = 'ADMIN' | 'STAFF'

export type AppSessionUser = {
  id: string
  email: string
  name: string
  role: AppRole
}

export type AssetUserOption = {
  id: string
  name: string
  email: string
}

export type AssetRecord = {
  id: string
  assetTag: string
  type: string
  brand: string
  model: string
  serialNumber?: string | null
  status: string
  assignedUserId?: string | null
  assignedUser?: AssetUserOption | null
  warrantyExpiry?: string | Date | null
  notes?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export type AuditLogRecord = {
  id: string
  action: string
  detail?: string | null
  createdAt: string | Date
  user?: Pick<AssetUserOption, 'name' | 'email'> | null
}
