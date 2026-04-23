'use client'

import { useState } from 'react'
import { LoaderCircle, Mail, Sparkles, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { getSafeRedirectPath, getURL } from '@/lib/site-url'

type Props = {
  defaultEmail?: string
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

export function MagicLinkModal({ defaultEmail = '', nextPath }: Props) {
  const [email, setEmail] = useState(defaultEmail)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  function openModal() {
    setEmail(defaultEmail.trim().toLowerCase())
    setError('')
    setSuccess('')
    setIsModalOpen(true)
  }

  function closeModal() {
    if (isLoading) {
      return
    }

    setIsModalOpen(false)
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Enter your email before requesting a magic link.')
      setSuccess('')
      return
    }

    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: getMagicLinkRedirect(nextPath),
        },
      })

      if (magicLinkError) {
        setError(magicLinkError.message)
        return
      }

      setSuccess('Magic link sent. Check your inbox to continue.')
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to send the magic link.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
      >
        Sign in with Magic Link
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Magic Link
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Sign in by email</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  We&apos;ll send a one-time sign-in link to your inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close magic link modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {success ? (
              <div>
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  {success}
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-5 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="flex flex-col gap-5">
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

                {error && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Sending Link...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Send Link
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
