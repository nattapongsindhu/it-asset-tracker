'use client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Props = {
  className?: string
}

export function SignOutButton({ className }: Props) {
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
      className={
        className ??
        'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900'
      }
    >
      <span className="inline-flex items-center gap-2">
        <LogOut className="h-4 w-4" />
        Sign out
      </span>
    </button>
  )
}
