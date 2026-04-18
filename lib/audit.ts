import type { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from './prisma'

type AuditParams = {
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  detail?: string | null
}

type AuditClient = PrismaClient | Prisma.TransactionClient

export async function logAudit(params: AuditParams, db: AuditClient = prisma) {
  await db.auditLog.create({ data: params })
}
