import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSafeRedirectPath, getURL } from '@/lib/site-url'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const origin = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(new URL(getURL('/login', origin)))
  }

  try {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL(getURL('/login', origin)))
    }

    const redirectPath = getSafeRedirectPath(request.nextUrl.searchParams.get('next'))
    return NextResponse.redirect(new URL(getURL(redirectPath, origin)))
  } catch {
    return NextResponse.redirect(new URL(getURL('/login', origin)))
  }
}
