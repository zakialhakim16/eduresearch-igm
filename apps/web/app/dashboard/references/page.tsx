'use client'

import { useState } from 'react'
import { Paper } from '@/lib/openalex'

export default function ReferencesPage() {
  const [query, setQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [yearFrom, setYearFrom] = useState('2019')
  const [openAccess, setOpenAccess] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setPapers([])

    try {
      const params = new URLSearchParams({
        q: query,
        year_from: yearFrom,
        open_access: String(openAccess),
        per_page: '10'
      })

      const response = await fetch(`/api/references?${params}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)
      setPapers(data.papers)

    } catch (err) {
      setError('Gagal mencari referensi. Coba lagi!')
      console.error(err)
    }

    setLoading(false)
  }

  async function handleSave(paper: Paper) {
    try {
      const response = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper, sessionId: null })
      })

      if (response.ok) {
        setSavedIds(prev => new Set([...prev, paper.id]))
      }
    } catch (err) {
      console.error('Gagal simpan:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
          ← Dashboard
        </a>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-semibold">Cari Referensi</h1>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Search Box */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold mb-1">Cari Referensi Akademik</h2>
            <p className="text-sm text-muted-foreground">
              Didukung oleh OpenAlex — 250 juta+ karya ilmiah
            </p>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Contoh: IoT waste management, machine learning education..."
              className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Mencari...' : 'Cari'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Dari tahun:</label>
              <select
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm bg-background focus:outline-none"
              >
                <option value="2019">2019</option>
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={openAccess}
                onChange={(e) => setOpenAccess(e.target.checked)}
                className="rounded"
              />
              Open Access saja
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="border rounded-xl p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && papers.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {papers.length} hasil ditemukan
            </p>

            {papers.map((paper) => (
              <div
                key={paper.id}
                className="border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-sm leading-relaxed flex-1">
                    {paper.title}
                  </h3>
                  {paper.is_open_access && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full whitespace-nowrap shrink-0">
                      Open Access
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {paper.authors.length > 0 && (
                    <span>👤 {paper.authors.join(', ')}{paper.authors.length >= 3 ? ' et al.' : ''}</span>
                  )}
                  <span>📅 {paper.year}</span>
                  <span>📰 {paper.journal}</span>
                  <span>🔖 {paper.cited_by_count} sitasi</span>
                </div>

                {/* Abstract */}
                {paper.abstract && paper.abstract !== 'Abstrak tidak tersedia' && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {paper.abstract}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Buka Paper →
                    </a>
                  )}
                  {paper.doi && (
                    <span className="text-xs text-muted-foreground">
                      DOI: {paper.doi.replace('https://doi.org/', '')}
                    </span>
                  )}
                  <div className="ml-auto">
                    <button
                      onClick={() => handleSave(paper)}
                      disabled={savedIds.has(paper.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        savedIds.has(paper.id)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-primary text-primary-foreground hover:opacity-90'
                      }`}
                    >
                      {savedIds.has(paper.id) ? '✓ Tersimpan' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && papers.length === 0 && query && !error && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Tidak ada hasil untuk &quot;{query}&quot;
          </div>
        )}

        {/* Initial state */}
        {!loading && papers.length === 0 && !query && (
          <div className="text-center py-12 space-y-2">
            <p className="text-4xl">🔍</p>
            <p className="text-muted-foreground text-sm">
              Ketik topik penelitianmu untuk mencari referensi
            </p>
            <p className="text-xs text-muted-foreground">
              Contoh: &quot;machine learning&quot;, &quot;IoT agriculture&quot;, &quot;sistem informasi&quot;
            </p>
          </div>
        )}

      </main>
    </div>
  )
}