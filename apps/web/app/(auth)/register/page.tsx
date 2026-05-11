'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const FAKULTAS_PRODI = {
  'Ilmu Komputer & Sains': [
    'Teknik Informatika',
    'Sistem Informasi',
    'Sistem Komputer',
    'Biologi',
    'Kimia'
  ],
  'Teknik': [
    'Teknik Sipil',
    'Arsitektur',
    'Perencanaan Wilayah & Kota',
    'K3',
    'Survei & Pemetaan'
  ],
  'Ekonomi': [
    'Manajemen',
    'Akuntansi'
  ],
  'Ilmu Pemerintahan & Budaya': [
    'Ilmu Pemerintahan',
    'Desain Komunikasi Visual'
  ],
  'Keguruan Ilmu Pendidikan': [
    'Pendidikan Bahasa Inggris'
  ]
}

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

 const [form, setForm] = useState({
  nama: '',
  npm: '',
  email: '',
  password: '',
  jenjang: '',
  fakultas: '',
  prodi: ''
})

  function updateForm(key: string, value: string) {
  if (key === 'npm') {
    setForm(prev => ({
      ...prev,
      npm: value,
      email: `${value}@student.uigm.ac.id`
    }))
    return
  }
  if (key === 'fakultas') {
    setForm(prev => ({ ...prev, fakultas: value, prodi: '' }))
    return
  }
  setForm(prev => ({ ...prev, [key]: value }))
}
  async function handleRegister() {
    setLoading(true)
    setError('')

    // Validasi email UIGM
    if (!form.email.endsWith('@uigm.ac.id') && !form.email.endsWith('@student.uigm.ac.id')) {
      setError('Hanya email UIGM yang diizinkan')
      setLoading(false)
      return
    }

    // Daftar ke Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Simpan profil ke tabel users
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: form.email,
          nama: form.nama,
          jenjang: form.jenjang,
          fakultas: form.fakultas,
          prodi: form.prodi,
          onboarding_complete: false
        })

      if (profileError) {
        setError('Gagal simpan profil: ' + profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 border rounded-xl shadow-sm">

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Daftar EduResearch AI</h1>
          <p className="text-muted-foreground text-sm">
            Step {step} dari 2
          </p>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* Step 1 — Data Diri */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Muhammad Zaki Al Hakim"
                value={form.nama}
                onChange={(e) => updateForm('nama', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">NPM</label>
              <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <input
                  type="text"
                  placeholder="2021001"
                  value={form.npm}
                  onChange={(e) => updateForm('npm', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                />
                <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border-l">
                  @student.uigm.ac.id
                </span>
              </div>
              {form.npm && (
                <p className="text-xs text-muted-foreground">
                  Email: {form.npm}@student.uigm.ac.id
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => updateForm('password', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={() => {
                if (!form.nama || !form.npm || !form.password) {
                  setError('Semua field wajib diisi')
                  return
                }
                if (form.npm.trim() === '') {
                  setError('NPM tidak boleh kosong')
                  return
                }
                setError('')
                setStep(2)
              }}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              Lanjut →
            </button>
          </div>
        )}

        {/* Step 2 — Akademik */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenjang</label>
              <select
                value={form.jenjang}
                onChange={(e) => updateForm('jenjang', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="">Pilih jenjang</option>
                <option value="D3">D3 — Diploma</option>
                <option value="D4">D4 — Sarjana Terapan</option>
                <option value="S1">S1 — Sarjana</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fakultas</label>
              <select
                value={form.fakultas}
                onChange={(e) => updateForm('fakultas', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="">Pilih fakultas</option>
                {Object.keys(FAKULTAS_PRODI).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {form.fakultas && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Program Studi</label>
                <select
                  value={form.prodi}
                  onChange={(e) => updateForm('prodi', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="">Pilih prodi</option>
                  {FAKULTAS_PRODI[form.fakultas as keyof typeof FAKULTAS_PRODI].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border rounded-lg text-sm font-medium hover:bg-muted"
              >
                ← Kembali
              </button>
              <button
                onClick={handleRegister}
                disabled={loading || !form.jenjang || !form.fakultas || !form.prodi}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Mendaftar...' : 'Daftar'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <a href="/login" className="text-primary hover:underline">
            Masuk
          </a>
        </p>
      </div>
    </div>
  )
}