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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,_#f4efe5_0%,_#efe7d9_100%)]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="flex flex-col justify-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              IT Asset Tracker
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Production-grade access for internal asset operations.
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-600">
              Sign in to manage inventory, assignments, maintenance history, and warranty actions from one structured workspace.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4" />
                  Verified access
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Protected routes, role checks, and session redirects keep staff and admins in the correct workflow.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <KeyRound className="h-4 w-4" />
                  Operations ready
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Admins can manage the full lifecycle while staff stay inside a controlled self-service view.
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
