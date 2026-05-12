'use client'

import { useState } from 'react'

type ReferenceItem = {
  id?: string
  openalex_id?: string
  title: string
  authors?: string[]
  year?: number | null
  publication_year?: number | null
  journal?: string | null
  source?: string | null
  doi?: string | null
  url?: string | null
  abstract?: string | null
  cited_by_count?: number | null
  is_open_access?: boolean | null
}

export default function ReferencesPage() {
  const [query, setQuery] = useState('')
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setError('Masukkan topik atau keyword referensi terlebih dahulu.')
      return
    }

    setLoading(true)
    setError('')
    setSearched(true)
    setReferences([])

    try {
      const response = await fetch(
        `/api/references?query=${encodeURIComponent(trimmedQuery)}`
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Gagal mencari referensi')
      }

      const data =
        result.references ??
        result.papers ??
        result.results ??
        result.data ??
        []

      setReferences(data)
    } catch (error) {
      console.error(error)
      setError(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mencari referensi.'
      )
    } finally {
      setLoading(false)
    }
  }

  function getReferenceId(ref: ReferenceItem, index: number) {
    return ref.openalex_id ?? ref.id ?? `${ref.title}-${index}`
  }

  function getYear(ref: ReferenceItem) {
    return ref.year ?? ref.publication_year ?? null
  }

  function getJournal(ref: ReferenceItem) {
    return ref.journal ?? ref.source ?? 'Sumber tidak tersedia'
  }

  return (
    <div className="min-h-full min-w-0 px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-10">
        <section className="space-y-3 text-center pt-8">
          <p className="text-sm text-muted-foreground">Reference Engine</p>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Cari referensi akademik
          </h1>

          <p className="mx-auto max-w-2xl text-muted-foreground">
            Masukkan topik riset, metode, atau keyword penelitian. EduResearch
            akan membantu menemukan paper yang relevan dari sumber akademik.
          </p>
        </section>

        <section className="mx-auto max-w-3xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="rounded-2xl border bg-background p-3 shadow-sm">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                placeholder="Contoh: support vector machine phishing website detection chi-square feature selection"
                className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    e.currentTarget.form?.requestSubmit()
                  }
                }}
              />

              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Tekan Enter untuk cari, Shift + Enter untuk baris baru.
                </p>

                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Mencari...' : 'Cari Referensi'}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </form>
        </section>

        {!searched && (
          <section className="grid gap-3 md:grid-cols-3">
            {[
              'phishing website detection',
              'support vector machine classification',
              'chi-square feature selection',
            ].map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="rounded-2xl border p-4 text-left text-sm hover:bg-muted/40"
              >
                <p className="font-medium">{example}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gunakan sebagai contoh pencarian.
                </p>
              </button>
            ))}
          </section>
        )}

        {loading && (
          <section className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border p-5 space-y-3 animate-pulse"
              >
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
              </div>
            ))}
          </section>
        )}

        {!loading && searched && references.length === 0 && !error && (
          <section className="rounded-2xl border p-8 text-center">
            <p className="font-medium">Belum ada referensi ditemukan</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Coba gunakan keyword yang lebih umum, misalnya metode utama atau
              bidang penelitian.
            </p>
          </section>
        )}

        {!loading && references.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="font-semibold">Hasil Referensi</h2>
              <p className="text-sm text-muted-foreground">
                Ditemukan {references.length} referensi untuk pencarian ini.
              </p>
            </div>

            <div className="space-y-4">
              {references.map((ref, index) => (
                <article
                  key={getReferenceId(ref, index)}
                  className="rounded-2xl border bg-background p-5 space-y-3 hover:shadow-sm transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {ref.is_open_access && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                          Open Access
                        </span>
                      )}

                      {getYear(ref) && (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {getYear(ref)}
                        </span>
                      )}

                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        Sitasi: {ref.cited_by_count ?? 0}
                      </span>
                    </div>

                    <h3 className="font-semibold leading-relaxed">{ref.title}</h3>

                    <p className="text-sm text-muted-foreground">
                      {ref.authors && ref.authors.length > 0
                        ? ref.authors.slice(0, 5).join(', ')
                        : 'Author tidak tersedia'}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {getJournal(ref)}
                    </p>
                  </div>

                  {ref.abstract && (
                    <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                      {ref.abstract}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      >
                        Buka Referensi →
                      </a>
                    )}

                    {ref.doi && (
                      <span className="text-xs text-muted-foreground">
                        DOI: {ref.doi}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
