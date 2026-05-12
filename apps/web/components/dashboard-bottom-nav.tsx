'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/dashboard/proposal', label: 'Chat', icon: '✍️' },
  { href: '/dashboard/documents', label: 'Dokumen', icon: '📁' },
  { href: '/dashboard/references', label: 'Referensi', icon: '🔍' },
  { href: '/dashboard/settings', label: 'Setelan', icon: '⚙️' },
] as const

export function DashboardBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/80 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.35)]">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors sm:text-xs ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all ${
                  active
                    ? 'bg-primary/15 shadow-inner ring-1 ring-primary/20'
                    : ''
                }`}
              >
                {icon}
              </span>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
