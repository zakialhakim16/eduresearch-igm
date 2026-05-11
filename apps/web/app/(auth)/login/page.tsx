'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError('Email atau password salah')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 border rounded-xl shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">EduResearch AI</h1>
          <p className="text-muted-foreground text-sm">
            Masuk dengan NPM UIGM kamu
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">NPM</label>
            <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
              <input
                type="text"
                placeholder="2023110105"
                value={npm}
                onChange={(e) => handleNpmChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
              />
              <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border-l">
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
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <a href="/register" className="text-primary hover:underline">
              Daftar sekarang
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}