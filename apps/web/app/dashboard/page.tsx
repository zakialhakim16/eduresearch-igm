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
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-10">
        <section className="space-y-3 text-center pt-10">
          <p className="text-sm text-muted-foreground">
            EduResearch AI
          </p>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Halo, {firstName}. Mau lanjut riset dari mana?
          </h1>

          <p className="mx-auto max-w-2xl text-muted-foreground">
            Upload dokumen, cari referensi, atau lanjutkan sesi bimbingan riset
            berbasis AI.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard/proposal"
            className="rounded-2xl border p-5 hover:shadow-md transition-shadow space-y-3"
          >
            <div className="text-2xl">✍️</div>
            <div>
              <h2 className="font-semibold">Mulai Bimbingan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Mulai diskusi Socratic dari nol.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/documents"
            className="rounded-2xl border p-5 hover:shadow-md transition-shadow space-y-3"
          >
            <div className="text-2xl">📁</div>
            <div>
              <h2 className="font-semibold">Upload Dokumen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Analisis proposal, jurnal, atau skripsi.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/references"
            className="rounded-2xl border p-5 hover:shadow-md transition-shadow space-y-3"
          >
            <div className="text-2xl">🔍</div>
            <div>
              <h2 className="font-semibold">Cari Referensi</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Temukan paper dari OpenAlex.
              </p>
            </div>
          </Link>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-5 space-y-4">
            <div>
              <h2 className="font-semibold">Dokumen Terbaru</h2>
              <p className="text-sm text-muted-foreground">
                Dokumen akademik yang terakhir kamu upload.
              </p>
            </div>

            {!documents || documents.length === 0 ? (
              <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                Belum ada dokumen. Upload dokumen pertama kamu.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href="/dashboard/documents"
                    className="block rounded-xl border p-4 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-sm truncate">
                        {doc.nama_file}
                      </p>

                      <span className="text-xs rounded-full bg-muted px-2 py-1">
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

          <div className="rounded-2xl border p-5 space-y-4">
            <div>
              <h2 className="font-semibold">Sesi Bimbingan</h2>
              <p className="text-sm text-muted-foreground">
                Lanjutkan sesi riset berbasis dokumen.
              </p>
            </div>

            {!sessions || sessions.length === 0 ? (
              <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                Belum ada sesi. Mulai dari dokumen yang sudah dianalisis.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/${session.modul}?session_id=${session.id}`}
                    className="block rounded-xl border p-4 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-sm">
                        {session.document_id
                          ? `Sesi ${session.modul}`
                          : 'Bimbingan Baru'}
                      </p>

                      <span className="text-xs rounded-full bg-muted px-2 py-1">
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

        <section className="rounded-2xl border p-5">
          <h2 className="font-semibold">Profil Akademik</h2>

          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Nama</p>
              <p className="font-medium">{profile?.nama ?? '-'}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Jenjang</p>
              <p className="font-medium">{profile?.jenjang ?? '-'}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Fakultas</p>
              <p className="font-medium">{profile?.fakultas ?? '-'}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Program Studi</p>
              <p className="font-medium">{profile?.prodi ?? '-'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}