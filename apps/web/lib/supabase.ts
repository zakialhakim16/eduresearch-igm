import { createBrowserClient } from '@supabase/ssr'
import { readSupabasePublicEnv } from '@/lib/supabase-public-env'

/** Prefer `useSupabaseBrowserClient()` in client components to avoid SSR issues. */
export function createClient() {
  const parsed = readSupabasePublicEnv()
  if (!parsed) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (URL must start with http:// or https://).'
    )
  }
  return createBrowserClient(parsed.url, parsed.anonKey)
}