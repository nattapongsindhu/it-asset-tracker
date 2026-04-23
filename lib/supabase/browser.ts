import { createBrowserClient } from '@supabase/ssr'

function getSupabaseBrowserEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase browser environment variables.')
  }

  return { supabaseUrl, supabaseAnonKey }
}

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserEnv()

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
