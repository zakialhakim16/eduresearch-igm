'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DashboardNavLinkProps = {
  href: string
  /** `exact` untuk /dashboard saja — hindari aktif di sub-route. */
  activeMatch?: 'exact' | 'prefix'
  children: ReactNode
}

export function DashboardNavLink({
  href,
  activeMatch = 'prefix',
  children,
}: DashboardNavLinkProps) {
  const pathname = usePathname()

  const active =
    activeMatch === 'exact'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        'nav-link-dashboard',
        active &&
          'bg-background font-medium text-foreground shadow-sm ring-1 ring-black/4 dark:bg-background/80 dark:ring-white/6'
      )}
    >
      {children}
    </Link>
  )
}
