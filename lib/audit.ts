import { prisma } from './prisma'

type AuditParams = {
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  detail?: string | null
}

export async function logAudit(params: AuditParams) {
  await prisma.auditLog.create({ data: params })
}
