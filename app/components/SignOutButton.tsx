'use client'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Failed to sign out with Supabase', error)
    }

    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-gray-500 hover:text-gray-900"
    >
      Sign out
    </button>
  )
}
