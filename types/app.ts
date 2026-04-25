export type AppRole = 'ADMIN' | 'STAFF'

export type AssetStatus = 'IN_STOCK' | 'ASSIGNED' | 'IN_REPAIR' | 'RETIRED'
export type AssetAssignmentStatus = 'ASSIGNED' | 'RETURNED'

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

export type AssetLocationOption = {
  id: string
  name: string
  building?: string | null
  floor?: string | null
  label: string
}

export type AssetRecord = {
  id: string
  assetTag: string
  type: string
  brand: string
  model: string
  serialNumber?: string | null
  status: AssetStatus
  assignedUserId?: string | null
  assignedUser?: AssetUserOption | null
  locationId?: string | null
  location?: AssetLocationOption | null
  warrantyExpiry?: string | Date | null
  notes?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export type AssetAssignmentRecord = {
  id: string
  assetId?: string | null
  assetTagSnapshot?: string | null
  status: AssetAssignmentStatus
  assignedAt: string | Date
  returnedAt?: string | Date | null
  note?: string | null
  user?: AssetUserOption | null
  assignedBy?: AssetUserOption | null
  returnedBy?: AssetUserOption | null
}

export type AuditLogRecord = {
  id: string
  action: string
  detail?: string | null
  createdAt: string | Date
  user?: Pick<AssetUserOption, 'name' | 'email'> | null
}
