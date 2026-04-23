import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { AppRole, AppSessionUser } from '@/types/app'
import { createSupabaseServerClient } from './server'

type ProfileRow = {
  email: string | null
  full_name: string | null
  role: string | null
}

function normalizeRole(role: unknown): AppRole {
  return role === 'ADMIN' ? 'ADMIN' : 'STAFF'
}

function mapUser(user: User, profile: ProfileRow | null): AppSessionUser {
  const metadata = user.user_metadata ?? {}
  const fallbackName =
    typeof metadata.name === 'string' && metadata.name.trim().length > 0
      ? metadata.name
      : user.email?.split('@')[0] ?? 'User'
  const profileName = profile?.full_name?.trim()

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? '',
    name: profileName && profileName.length > 0 ? profileName : fallbackName,
    role: normalizeRole(profile?.role),
  }
}

export async function getSupabaseSessionUser(): Promise<AppSessionUser | null> {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .eq('id', user.id)
      .maybeSingle()

    return mapUser(user, profile ?? null)
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
