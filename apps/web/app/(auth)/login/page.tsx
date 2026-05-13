'use client'

import { useState } from 'react'
import { isSupabasePublicEnvConfigured } from '@/lib/supabase-public-env'
import { useSupabaseBrowserClient } from '@/lib/use-supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function loginErrorMessage(error: { message?: string; name?: string } | null) {
  if (!error) return 'Email atau password salah'
  const msg = (error.message ?? '').toLowerCase()
  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    error.name === 'AuthRetryableFetchError'
  ) {
    return 'Tidak dapat menghubungi server autentikasi. Periksa koneksi internet atau pastikan variabel lingkungan Supabase (NEXT_PUBLIC_SUPABASE_URL) sudah benar di deployment.'
  }
  return 'Email atau password salah'
}

export default function LoginPage() {
  const [npm, setNpm] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleNpmChange(value: string) {
    setNpm(value)
    setEmail(`${value}@student.uigm.ac.id`)
  }
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useSupabaseBrowserClient()
  const envOk = isSupabasePublicEnvConfigured()

  async function handleLogin() {
    setLoading(true)
    setError('')

    if (!envOk) {
      setError(
        'Aplikasi belum dikonfigurasi: atur NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY (nilai ini harus ada saat build di Vercel).'
      )
      setLoading(false)
      return
    }

    if (!supabase) {
      setError('Menghubungkan ke server… coba lagi dalam sebentar.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(loginErrorMessage(error))
      setLoading(false)
      return
    }

    // Supaya cookie sesi terbaca di Server Components / middleware setelah login
    router.refresh()
    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="dashboard-app-bg min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-10 lg:gap-14">
        <section className="w-full lg:w-[42%]">
          <div className="mb-12">
            <p className="text-lg font-semibold tracking-tight">EduResearch</p>
          </div>

          <div className="space-y-10">
            <div className="space-y-3">
              <h1 className="max-w-sm text-4xl font-semibold leading-tight md:text-5xl">
                Bimbingan Riset
                <br />
                Berbasis AI
              </h1>
              <p className="text-sm text-muted-foreground">
                Platform mentor riset digital untuk mahasiswa UIGM. Mulai dari proposal hingga publikasi jurnal.
              </p>
            </div>

            <div className="w-full max-w-md space-y-4 rounded-3xl border border-border/70 bg-card/90 p-6 shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] backdrop-blur-md dark:border-white/10 dark:bg-card/80 dark:shadow-black/40 dark:ring-white/[0.06]">
              {!envOk && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Supabase belum dikonfigurasi. Tambahkan{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> dan{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di
                  Vercel (Environment Variables), lalu deploy ulang agar nilai ikut ke bundle browser.
                </p>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">NPM</label>
                <div className="flex items-center overflow-hidden rounded-lg border border-input bg-muted focus-within:ring-2 focus-within:ring-primary">
                  <input
                    type="text"
                    placeholder="2023110105"
                    value={npm}
                    onChange={(e) => handleNpmChange(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                  <span className="border-l border-border bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                    @student.uigm.ac.id
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                onClick={handleLogin}
                disabled={loading || !envOk || (envOk && !supabase)}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Masuk...' : 'Masuk'}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Belum punya akun?{' '}
                <Link href="/register" className="text-foreground hover:underline">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="hidden flex-1 lg:block">
          <div className="mx-auto w-full max-w-xl rounded-3xl bg-primary p-14 text-primary-foreground shadow-2xl">
            <p className="mb-12 text-3xl font-semibold tracking-tight">EduResearch AI</p>
            <h2 className="text-6xl font-semibold leading-tight">
              Bimbingan Riset
              <br />
              Cerdas &
              <br />
              Terstruktur
            </h2>
            <p className="mt-8 text-lg opacity-90">
              AI bukan menuliskan, tapi membimbing.
              <br />
              Kamu yang berpikir, AI yang memandu.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}