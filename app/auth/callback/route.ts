import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function getSafeRedirectPath(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next')

  if (next && next.startsWith('/') && !next.startsWith('/login') && !next.startsWith('/auth/')) {
    return next
  }

  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const redirectPath = getSafeRedirectPath(request)
    return NextResponse.redirect(new URL(redirectPath, request.url))
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
