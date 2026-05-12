import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase.server'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('nama, jenjang, fakultas, prodi')
    .eq('id', user?.id)
    .single()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, nama_file, jenis, status, created_at')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, modul, status, created_at, document_id')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const firstName = profile?.nama?.split(' ')[0] ?? 'Mahasiswa'

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 md:py-12">
      <div className="mx-auto max-w-4xl space-y-12 md:space-y-14">
        <section className="relative pt-4 md:pt-6">
          <div
            className="pointer-events-none absolute -inset-x-8 -top-6 -z-10 h-64 rounded-[2.5rem] bg-gradient-to-b from-primary/[0.12] via-primary/[0.04] to-transparent blur-2xl md:h-80 dark:from-primary/25 dark:via-primary/10"
            aria-hidden
          />

          <div className="space-y-5 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm dark:bg-primary/15">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              EduResearch AI
            </div>

            <h1 className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl lg:text-[2.35rem] lg:leading-tight">
              Halo, {firstName}. Mau lanjut riset dari mana?
            </h1>

            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Upload dokumen, cari referensi, atau lanjutkan sesi bimbingan riset
              berbasis AI — semua dalam satu workspace.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
          <Link href="/dashboard/proposal" className="group dash-action-card">
            <div className="dash-action-card-icon bg-gradient-to-br from-primary/25 to-primary/5 shadow-primary/10">
              ✍️
            </div>
            <div>
              <h2 className="font-semibold tracking-tight">Mulai Bimbingan</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Diskusi Socratic dari nol — tanpa dokumen pun bisa.
              </p>
            </div>
          </Link>

          <Link href="/dashboard/documents" className="group dash-action-card">
            <div className="dash-action-card-icon bg-gradient-to-br from-accent/35 to-accent/10">
              📁
            </div>
            <div>
              <h2 className="font-semibold tracking-tight">Upload Dokumen</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Proposal, jurnal, atau skripsi — parsing & analisis otomatis.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/references"
            className="group dash-action-card sm:col-span-2 md:col-span-1"
          >
            <div className="dash-action-card-icon bg-gradient-to-br from-chart-1/25 via-primary/15 to-chart-2/20">
              🔍
            </div>
            <div>
              <h2 className="font-semibold tracking-tight">Cari Referensi</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Paper akademik dari OpenAlex, simpan ke koleksi kamu.
              </p>
            </div>
          </Link>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="dash-panel space-y-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Dokumen Terbaru
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Yang terakhir kamu unggah.
              </p>
            </div>

            {!documents || documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada dokumen. Mulai dari kartu Upload di atas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href="/dashboard/documents"
                    className="group block rounded-2xl border border-transparent bg-muted/25 px-4 py-3.5 transition-all hover:border-primary/20 hover:bg-muted/50 dark:hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium group-hover:text-primary">
                        {doc.nama_file}
                      </p>

                      <span className="shrink-0 rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/60 dark:bg-background/50">
                        {doc.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {doc.jenis} · {formatDate(doc.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="dash-panel space-y-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Sesi Bimbingan
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lanjutkan percakapan risetmu.
              </p>
            </div>

            {!sessions || sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada sesi. Buka Mulai Bimbingan untuk membuat yang pertama.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/${session.modul}?session_id=${session.id}`}
                    className="group block rounded-2xl border border-transparent bg-muted/25 px-4 py-3.5 transition-all hover:border-primary/20 hover:bg-muted/50 dark:hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium group-hover:text-primary">
                        {session.document_id
                          ? `Sesi ${session.modul}`
                          : 'Bimbingan Baru'}
                      </p>

                      <span className="shrink-0 rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/60 dark:bg-background/50">
                        {session.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(session.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="dash-panel">
          <h2 className="text-lg font-semibold tracking-tight">
            Profil Akademik
          </h2>

          <div className="mt-6 grid gap-5 text-sm md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nama
              </p>
              <p className="font-medium">{profile?.nama ?? '-'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Jenjang
              </p>
              <p className="font-medium">{profile?.jenjang ?? '-'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fakultas
              </p>
              <p className="font-medium">{profile?.fakultas ?? '-'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Program Studi
              </p>
              <p className="font-medium">{profile?.prodi ?? '-'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
