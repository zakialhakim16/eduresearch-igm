/**
 * Real Supabase URL + anon key from env.
 * Placeholders are only used in Node (middleware / Server Components) when env
 * is missing so `next build` prerender does not throw; the browser must never
 * call Supabase with those placeholders.
 */
const PLACEHOLDER_URL = 'https://example.invalid'

/** JWT-shaped dummy; only for server-side client construction when env is absent. */
const PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export function readSupabasePublicEnv(): { url: string; anonKey: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
  if (!/^https?:\/\//i.test(url) || anonKey.length === 0) {
    return null
  }
  return { url, anonKey }
}

export function isSupabasePublicEnvConfigured(): boolean {
  return readSupabasePublicEnv() !== null
}

/** For middleware and `createServerClient` only — not for browser bundles. */
export function getSupabasePublicCredentialsOrPlaceholder(): {
  url: string
  anonKey: string
} {
  const parsed = readSupabasePublicEnv()
  if (parsed) {
    return parsed
  }
  return {
    url: PLACEHOLDER_URL,
    anonKey: PLACEHOLDER_ANON_KEY,
  }
}
