import { createSupabaseServerClient } from './supabase/server'

type AuditDetail = string | number | boolean | null | Record<string, unknown> | Array<unknown>

type AuditParams = {
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  detail?: AuditDetail
}

export async function logAudit(params: AuditParams) {
  try {
    const supabase = createSupabaseServerClient()

    await supabase.from('audit_logs').insert({
      action: params.action,
      actor_id: params.userId ?? null,
      detail: params.detail ?? null,
      entity_id: params.entityId ?? null,
      entity_type: params.entityType,
    })
  } catch (error) {
    console.error('Failed to write audit log.', error)
  }
}
