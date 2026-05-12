import Link from 'next/link'
import {
  FolderOpen,
  LayoutDashboard,
  PenLine,
  Search,
  Settings,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { DashboardBottomNav } from '@/components/dashboard-bottom-nav'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type DashboardLayoutProps = {
  children: React.ReactNode
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

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('nama, jenjang, prodi')
    .eq('id', user.id)
    .single()

  const { data: recentSessions } = await supabase
    .from('sessions')
    .select(`
      id,
      title,
      modul,
      status,
      created_at,
      document_id,
      documents (
        id,
        nama_file,
        jenis,
        status
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12)

  const uniqueRecentSessions = recentSessions
    ? recentSessions.filter((session, index, self) => {
        if (!session.document_id) return true

        return (
          index ===
          self.findIndex((item) => item.document_id === session.document_id)
        )
      })
    : []

  return (
    <div className="dashboard-app-bg h-screen max-h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-screen max-h-screen overflow-hidden">
        <aside className="sidebar-glass hidden h-screen max-h-screen w-72 shrink-0 flex-col overflow-hidden md:flex">
          <div className="shrink-0 border-b border-border/60 px-5 py-5">
            <Link href="/dashboard" className="group block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25">
                  ER
                </div>
                <div>
                  <h1 className="font-semibold tracking-tight text-foreground">
                    EduResearch AI
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Mentor riset akademik
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="shrink-0 space-y-2 px-3 py-4">
            <Link href="/dashboard/proposal" className="nav-link-dashboard">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 shadow-sm dark:bg-background/50">
                <PenLine className="h-4 w-4 text-foreground/85" aria-hidden />
              </span>
              <span>Bimbingan Baru</span>
            </Link>

            <Link href="/dashboard/documents" className="nav-link-dashboard">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 shadow-sm dark:bg-background/50">
                <FolderOpen className="h-4 w-4 text-foreground/85" aria-hidden />
              </span>
              <span>Dokumen Saya</span>
            </Link>

            <Link href="/dashboard/references" className="nav-link-dashboard">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 shadow-sm dark:bg-background/50">
                <Search className="h-4 w-4 text-foreground/85" aria-hidden />
              </span>
              <span>Cari Referensi</span>
            </Link>

            <Link href="/dashboard" className="nav-link-dashboard">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 shadow-sm dark:bg-background/50">
                <LayoutDashboard className="h-4 w-4 text-foreground/85" aria-hidden />
              </span>
              <span>Dashboard</span>
            </Link>

            <Link href="/dashboard/settings" className="nav-link-dashboard">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 shadow-sm dark:bg-background/50">
                <Settings className="h-4 w-4 text-foreground/85" aria-hidden />
              </span>
              <span>Pengaturan</span>
            </Link>
          </div>

          <div className="custom-sidebar-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-4 pt-1">
            <div className="space-y-2">
              <p className="px-3 text-xs font-medium text-muted-foreground">
                Riwayat Bimbingan
              </p>

              {uniqueRecentSessions.length === 0 ? (
                <div className="rounded-lg px-3 py-3 text-xs text-muted-foreground">
                  Belum ada riwayat bimbingan.
                </div>
              ) : (
                <div className="space-y-1">
                  {uniqueRecentSessions.map((session) => {
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
                          className="min-w-0 flex-1 px-3 py-2 text-sm"
                        >
                          <p className="truncate font-medium">
                            {document?.nama_file ??
                              session.title ??
                              'Bimbingan Baru'}
                          </p>
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
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border/60 px-5 py-4 space-y-3">
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-3 dark:bg-background/40">
              <p className="truncate text-sm font-medium">
                {profile?.nama ?? 'Mahasiswa'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.jenjang ?? 'S1'} · {profile?.prodi ?? 'Teknik Informatika'}
              </p>
            </div>

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-foreground"
              >
                Keluar
              </button>
            </form>
          </div>
        </aside>

        <main className="flex h-screen max-h-screen min-w-0 min-h-0 flex-1 flex-col overflow-hidden pb-20 md:pb-0">
          <header className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground shadow-sm">
                  ER
                </span>
                <span className="font-semibold tracking-tight">EduResearch</span>
              </Link>

              <div className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                <Link
                  href="/dashboard/documents"
                  className="rounded-full px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Dokumen
                </Link>
                <Link
                  href="/dashboard/proposal"
                  className="rounded-full px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Chat
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="rounded-full px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Akun
                </Link>
              </div>
            </div>
          </header>

          <div className="custom-main-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </main>
      </div>

      <DashboardBottomNav />
    </div>
  )
}
