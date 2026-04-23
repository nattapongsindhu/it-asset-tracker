type AuditParams = {
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  detail?: string | null
}

export async function logAudit(params: AuditParams) {
  // TODO: Implement Supabase insert for audit logging.
  console.warn('TODO: Implement Supabase audit log insert.', params)
}
