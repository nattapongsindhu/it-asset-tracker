import { redirect } from 'next/navigation'
import { getSupabaseSessionUser } from '@/lib/supabase/session'

export default async function Home() {
  const user = await getSupabaseSessionUser()

  if (user) {
    redirect(user.role === 'ADMIN' ? '/dashboard' : '/assets')
  }

  redirect('/login')
}
