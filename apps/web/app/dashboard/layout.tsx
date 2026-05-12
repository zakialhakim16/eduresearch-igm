import Link from 'next/link'
import { redirect } from 'next/navigation'
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
    .not('document_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(8)

  const uniqueRecentSessions = recentSessions
    ? recentSessions.filter((session, index, self) => {
        if (!session.document_id) return false

        return (
          index ===
          self.findIndex((item) => item.document_id === session.document_id)
        )
      })
    : []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
          <div className="border-b px-5 py-4">
            <Link href="/dashboard" className="block">
              <h1 className="font-bold text-lg">EduResearch AI</h1>
              <p className="text-xs text-muted-foreground">
                Mentor riset akademik
              </p>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            <div className="space-y-2">
              <Link
                href="/dashboard/proposal"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <span>✍️</span>
                <span>Bimbingan Baru</span>
              </Link>

              <Link
                href="/dashboard/documents"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <span>📁</span>
                <span>Dokumen Saya</span>
              </Link>

              <Link
                href="/dashboard/references"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <span>🔍</span>
                <span>Cari Referensi</span>
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <span>🏠</span>
                <span>Dashboard</span>
              </Link>
            </div>

            <div className="space-y-2">
              <p className="px-3 text-xs font-medium text-muted-foreground">
                Riwayat Bimbingan
              </p>

              {uniqueRecentSessions.length === 0 ? (
                <div className="rounded-lg px-3 py-3 text-xs text-muted-foreground">
                  Belum ada sesi berbasis dokumen.
                </div>
              ) : (
                <div className="space-y-1">
                  {uniqueRecentSessions.map((session) => {
                    const document = Array.isArray(session.documents)
                      ? session.documents[0]
                      : session.documents

                    return (
                      <Link
                        key={session.id}
                        href={getSessionUrl(session.modul, session.id)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-background"
                      >
                        <p className="truncate font-medium">
                          {document?.nama_file ?? 'Sesi Bimbingan'}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {session.modul} · {formatDate(session.created_at)}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="border-t px-5 py-4">
            <p className="truncate text-sm font-medium">
              {profile?.nama ?? 'Mahasiswa'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.jenjang ?? 'S1'} · {profile?.prodi ?? 'Teknik Informatika'}
            </p>
          </div>
        </aside>

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
            <Link href="/dashboard">
              <p className="font-bold">EduResearch AI</p>
            </Link>

            <div className="flex items-center gap-3 text-sm">
              <Link href="/dashboard/documents">Dokumen</Link>
              <Link href="/dashboard/proposal">Chat</Link>
            </div>
          </header>

          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
