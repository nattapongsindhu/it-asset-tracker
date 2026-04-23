import { redirect } from 'next/navigation'
import { getSupabaseSessionUser } from '@/lib/supabase/session'

export default async function Home() {
  const user = await getSupabaseSessionUser()

  if (user) {
    redirect('/dashboard')
  }

  redirect('/login')
}
