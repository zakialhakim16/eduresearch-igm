'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

/**
 * Browser-only Supabase client. Created after mount so SSR / static prerender
 * never instantiates a client, and we never send auth requests to placeholder URLs.
 */
export function useSupabaseBrowserClient(): SupabaseClient | null {
  const [client, setClient] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    let isMounted = true
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
    if (!/^https?:\/\//i.test(url) || !anonKey) {
      return
    }

    const browserClient = createBrowserClient(url, anonKey)

    queueMicrotask(() => {
      if (isMounted) {
        setClient(browserClient)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return client
}
