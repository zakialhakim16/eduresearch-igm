import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase.server'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('nama, email, jenjang, fakultas, prodi, onboarding_complete, created_at')
    .eq('id', user?.id)
    .single()

  const { count: documentsCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id)

  const { count: sessionsCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id)

  const { count: referencesCount } = await supabase
    .from('paper_references')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id)

  return (
    <div className="min-h-full min-w-0 px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Pengaturan Akun
          </h1>
          <p className="max-w-2xl text-sm md:text-base text-muted-foreground">
            Kelola informasi akademik, lihat aktivitas riset, dan keluar dari akun EduResearch AI.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">Dokumen</p>
            <p className="mt-2 text-3xl font-bold">{documentsCount ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dokumen yang sudah kamu upload.
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">Sesi Bimbingan</p>
            <p className="mt-2 text-3xl font-bold">{sessionsCount ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sesi Socratic yang sudah dibuat.
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">Referensi</p>
            <p className="mt-2 text-3xl font-bold">{referencesCount ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paper yang sudah disimpan.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-background p-5 space-y-5">
          <div>
            <h2 className="font-semibold">Profil Akademik</h2>
            <p className="text-sm text-muted-foreground">
              Informasi ini digunakan agar AI memberi arahan yang lebih sesuai dengan konteks akademikmu.
            </p>
          </div>

          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Nama</p>
              <p className="font-medium">{profile?.nama ?? '-'}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email ?? user?.email ?? '-'}</p>
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

            <div>
              <p className="text-muted-foreground">Onboarding</p>
              <p className="font-medium">
                {profile?.onboarding_complete ? 'Selesai' : 'Belum selesai'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-background p-5 space-y-5">
          <div>
            <h2 className="font-semibold">Aksi Cepat</h2>
            <p className="text-sm text-muted-foreground">
              Lanjutkan pekerjaan risetmu dari sini.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/dashboard/documents"
              className="rounded-xl border p-4 hover:bg-muted/40"
            >
              <p className="font-medium text-sm">Dokumen Saya</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload dan analisis dokumen.
              </p>
            </Link>

            <Link
              href="/dashboard/proposal"
              className="rounded-xl border p-4 hover:bg-muted/40"
            >
              <p className="font-medium text-sm">Bimbingan Baru</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mulai sesi Socratic.
              </p>
            </Link>

            <Link
              href="/dashboard/references"
              className="rounded-xl border p-4 hover:bg-muted/40"
            >
              <p className="font-medium text-sm">Cari Referensi</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Temukan paper akademik.
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border bg-background p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Keluar Akun</h2>
            <p className="text-sm text-muted-foreground">
              Kamu bisa masuk kembali menggunakan email UIGM yang sudah terdaftar.
            </p>
          </div>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:w-auto"
            >
              Keluar dari EduResearch AI
            </button>
          </form>
        </section>

        <section className="rounded-2xl border bg-muted/30 p-5">
          <p className="text-sm font-medium">EduResearch AI</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Local AI research assistant · Next.js · Supabase · Ollama · Rust Parser v2
          </p>
        </section>
      </div>
    </div>
  )
}
