'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSupabaseAdmin } from '@/lib/supabase/session'

function revalidateAuditViews() {
  revalidatePath('/audit')
}

export async function deleteAuditLog(id: string) {
  await requireSupabaseAdmin('/audit')

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('audit_logs').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidateAuditViews()
  return { error: undefined }
}

export async function clearAuditLogs() {
  await requireSupabaseAdmin('/audit')

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('audit_logs').delete().not('id', 'is', null)

  if (error) {
    return { error: error.message }
  }

  revalidateAuditViews()
  return { error: undefined }
}
