'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export type SidebarSessionRow = {
  id: string
  title: string | null
  modul: string
  status: string
  created_at: string
  document_id: string | null
  documents:
    | { id: string; nama_file: string; jenis: string; status: string }
    | { id: string; nama_file: string; jenis: string; status: string }[]
    | null
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getSessionUrl(modul: string, sessionId: string) {
  return `/dashboard/${modul}?session_id=${sessionId}`
}

function sessionLabel(session: SidebarSessionRow) {
  const document = Array.isArray(session.documents)
    ? session.documents[0]
    : session.documents
  return (
    document?.nama_file ??
    session.title?.trim() ??
    'Bimbingan Baru'
  )
}

type Props = {
  sessions: SidebarSessionRow[]
}

export function DashboardSidebarHistory({ sessions }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentSessionId = searchParams.get('session_id')

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg px-3 py-3 text-xs text-muted-foreground">
        Belum ada riwayat bimbingan.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {sessions.map((session) => {
        const active =
          pathname === `/dashboard/${session.modul}` &&
          currentSessionId === session.id

        const document = Array.isArray(session.documents)
          ? session.documents[0]
          : session.documents

        return (
          <div
            key={session.id}
            className="group flex items-center gap-1 rounded-lg hover:bg-background"
          >
            <Link
              href={getSessionUrl(session.modul, session.id)}
              className={cn(
                'min-w-0 flex-1 px-3 py-2 text-sm',
                active &&
                  'rounded-lg bg-background/90 font-medium ring-1 ring-primary/20 dark:bg-background/60'
              )}
            >
              <p className="truncate font-medium">{sessionLabel(session)}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {document ? session.modul : 'tanpa dokumen'} ·{' '}
                {formatDate(session.created_at)}
              </p>
            </Link>

            <form
              action="/api/sessions/delete"
              method="post"
              className="pr-2"
            >
              <input type="hidden" name="session_id" value={session.id} />
              <button
                type="submit"
                title="Hapus riwayat"
                aria-label="Hapus riwayat"
                className="rounded-md px-2 py-1 text-xs text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
              >
                ✕
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}
