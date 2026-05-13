import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicCredentials } from '@/lib/supabase-public-env'

export function createClient() {
  const { url, anonKey } = getSupabasePublicCredentials()
  return createBrowserClient(url, anonKey)
}