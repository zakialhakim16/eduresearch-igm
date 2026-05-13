'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

type CountBucket = {
  key: string
  count: number
}

type ResearchMap = {
  total_items: number
  top_topics: CountBucket[]
  top_methods: CountBucket[]
  top_keywords: CountBucket[]
  year_distribution: CountBucket[]
}

function BucketList({ items }: { items: CountBucket[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada data.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 6).map((item) => (
        <span
          key={item.key}
          className="rounded-full border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground"
        >
          {item.key} · {item.count}
        </span>
      ))}
    </div>
  )
}

export function ResearchMapPanel() {
  const [map, setMap] = useState<ResearchMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadMap() {
      try {
        const response = await fetch('/api/analytics/research-map')
        const result = await response.json()

        if (!isMounted) return

        if (!response.ok) {
          setError(result.error ?? 'Peta riset belum tersedia')
          return
        }

        setMap(result.map)
      } catch {
        if (isMounted) {
          setError('Peta riset belum tersedia')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMap()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="dash-panel space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Peta Riset Saya</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan topik dan keyword dari dokumen risetmu.
          </p>
        </div>

        {loading && <Spinner aria-label="Memuat peta riset" />}
      </div>

      {!loading && error && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {!loading && !error && map && map.total_items === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          Belum ada dokumen yang bisa dipetakan.
        </div>
      )}

      {!loading && !error && map && map.total_items > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Topik dominan</p>
            <BucketList items={map.top_topics} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Keyword utama</p>
            <BucketList items={map.top_keywords} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Metode</p>
            <BucketList items={map.top_methods} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Tahun dokumen</p>
            <BucketList items={map.year_distribution} />
          </div>
        </div>
      )}
    </section>
  )
}
