/**
 * Supabase clients validate URL shape at construction time. During `next build`
 * prerender (or static export), `NEXT_PUBLIC_*` may be unset — use placeholders
 * so the build completes; runtime still needs real values in deployment.
 */
const PLACEHOLDER_URL = 'https://example.invalid'

/** JWT-shaped dummy; only used when anon key is missing at build/prerender time. */
const PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export function getSupabasePublicCredentials(): { url: string; anonKey: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
  const urlOk = /^https?:\/\//i.test(url)

  if (urlOk && anonKey.length > 0) {
    return { url, anonKey }
  }

  return {
    url: urlOk ? url : PLACEHOLDER_URL,
    anonKey: anonKey.length > 0 ? anonKey : PLACEHOLDER_ANON_KEY,
  }
}
