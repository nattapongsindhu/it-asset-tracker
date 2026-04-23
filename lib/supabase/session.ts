import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { AppRole, AppSessionUser } from '@/types/app'
import { createSupabaseServerClient } from './server'

function normalizeRole(role: unknown): AppRole {
  return role === 'ADMIN' ? 'ADMIN' : 'STAFF'
}

function mapUser(user: User): AppSessionUser {
  const metadata = user.user_metadata ?? {}
  const appMetadata = user.app_metadata ?? {}
  const name =
    typeof metadata.name === 'string' && metadata.name.trim().length > 0
      ? metadata.name
      : user.email?.split('@')[0] ?? 'User'

  return {
    id: user.id,
    email: user.email ?? '',
    name,
    role: normalizeRole(appMetadata.role ?? metadata.role),
  }
}

export async function getSupabaseSessionUser(): Promise<AppSessionUser | null> {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user ? mapUser(user) : null
  } catch {
    return null
  }
}

export async function requireSupabaseUser() {
  const user = await getSupabaseSessionUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

export async function requireSupabaseAdmin(redirectTo = '/dashboard') {
  const user = await requireSupabaseUser()

  if (user.role !== 'ADMIN') {
    redirect(redirectTo)
  }

  return user
}
