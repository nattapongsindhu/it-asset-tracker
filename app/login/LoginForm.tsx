'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { KeyRound, Mail } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { MagicLinkModal } from './MagicLinkModal'

type Props = {
  nextPath: string
}

export function LoginForm({ nextPath }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  async function handlePasswordSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsPasswordLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.replace(nextPath)
      router.refresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to sign in right now.'
      setError(message)
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Secure Sign-In
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Access the asset workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sign in with your company email and password to continue into the workspace.
        </p>
      </div>

      <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
          <label className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="name@company.com"
            />
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
          <label className="relative block">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Enter your password"
            />
          </label>
        </div>

        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPasswordLoading}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPasswordLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="text-center text-sm text-slate-500">
          Need a one-time sign-in link instead?
        </p>
        <div className="mt-4 flex justify-center">
          <MagicLinkModal defaultEmail={email} nextPath={nextPath} />
        </div>
      </div>
    </div>
  )
}
