import type { ReactNode } from 'react'

/** Auth pages call Supabase in the client tree; avoid SSG when env is absent (e.g. CI). */
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
