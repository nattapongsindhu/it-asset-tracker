'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { KeyRound, Mail, Sparkles } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { getSafeRedirectPath, getURL } from '@/lib/site-url'

type Props = {
  nextPath: string
}

function getMagicLinkRedirect(nextPath: string) {
  const callbackUrl = new URL(getURL('/auth/callback', window.location.origin))
  const redirectPath = getSafeRedirectPath(nextPath)

  if (redirectPath !== '/dashboard') {
    callbackUrl.searchParams.set('next', redirectPath)
  }

  return callbackUrl.toString()
}

export function LoginForm({ nextPath }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePasswordSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

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
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: getMagicLinkRedirect(nextPath),
        },
      })

      if (magicLinkError) {
        setError(magicLinkError.message)
        return
      }

      setMessage('Magic link sent. Check your inbox to continue.')
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to send the magic link.'
      setError(message)
    } finally {
      setLoading(false)
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
          Use email and password for direct access, or request a magic link for a one-time sign-in.
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

        {message && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in with Password'}
        </button>
      </form>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Prefer a magic link?</p>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email above, then request a secure link.
            </p>
          </div>
          <button
            type="button"
            disabled={loading || !email.trim()}
            onClick={handleMagicLink}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Send Magic Link
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
