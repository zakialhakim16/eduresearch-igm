import { createServerSupabaseClient } from '@/lib/supabase.server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  // Cek session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ambil profil user
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">EduResearch AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {profile?.nama}
          </span>
          <span className="text-xs border px-2 py-1 rounded-full">
            {profile?.jenjang} — {profile?.prodi}
          </span>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">

        {/* Welcome */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            Halo, {profile?.nama?.split(' ')[0]} 👋
          </h2>
          <p className="text-muted-foreground">
            Mau mulai dari mana hari ini?
          </p>
        </div>

        {/* 3 Modul Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Proposal',
              desc: 'Buat & kembangkan proposal penelitian step by step',
              icon: '📋',
              href: '/dashboard/proposal',
              status: 'Tersedia'
            },
            {
              title: 'Skripsi / TA',
              desc: 'Bimbingan penulisan skripsi per bab',
              icon: '📖',
              href: '/dashboard/skripsi',
              status: 'Segera'
            },
            {
              title: 'Jurnal',
              desc: 'Panduan publikasi jurnal SINTA & internasional',
              icon: '📄',
              href: '/dashboard/jurnal',
              status: 'Segera'
            }
          ].map((modul) => (
            <div
              key={modul.title}
              className="border rounded-xl p-6 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{modul.icon}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  modul.status === 'Tersedia'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {modul.status}
                </span>
              </div>
              <h3 className="font-semibold">{modul.title}</h3>
              <p className="text-sm text-muted-foreground">{modul.desc}</p>
              {modul.status === 'Tersedia' && (
                <a
                  href={modul.href}
                  className="block text-center py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Mulai →
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Quick Access */}
        <div className="space-y-4">
          <h3 className="font-semibold">Akses Cepat</h3>
          <a
            href="/dashboard/references"
            className="flex items-center gap-4 border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-medium text-sm">Cari Referensi</p>
              <p className="text-xs text-muted-foreground">
                250 juta+ paper dari OpenAlex
              </p>
            </div>
            <span className="ml-auto text-muted-foreground">→</span>
          </a>
        </div>

        {/* Recent Sessions */}
        <div className="space-y-4">
          <h3 className="font-semibold">Sesi Terakhir</h3>
          <div className="border rounded-xl p-6 text-center text-muted-foreground text-sm">
            Belum ada sesi. Mulai dari modul Proposal di atas!
          </div>
        </div>

      </main>
    </div>
  )
}