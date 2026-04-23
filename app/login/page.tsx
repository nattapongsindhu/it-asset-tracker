import { redirect } from 'next/navigation'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { LoginForm } from './LoginForm'
import { getSupabaseSessionUser } from '@/lib/supabase/session'
import { getSafeRedirectPath } from '@/lib/site-url'

type Props = {
  searchParams?: {
    next?: string | string[]
  }
}

export default async function LoginPage({ searchParams }: Props) {
  const nextPath = getSafeRedirectPath(searchParams?.next)
  const user = await getSupabaseSessionUser()

  if (user) {
    redirect(nextPath)
  }

  return (
    <div className="min-h-screen bg-[#f3efe6]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="flex flex-col justify-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              IT Asset Tracker
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Hybrid sign-in for a clean internal asset workflow.
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-600">
              Magic link and email/password access both land in the same Supabase-backed workspace,
              with clear roles for admins and staff.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4" />
                  Safe entry
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Middleware guards protected routes and returns authenticated users to the dashboard.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <KeyRound className="h-4 w-4" />
                  Orderly access
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Admins can manage inventory while staff stay in a read-only flow with the same layout.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-lg">
            <LoginForm nextPath={nextPath} />
          </div>
        </div>
      </div>
    </div>
  )
}
