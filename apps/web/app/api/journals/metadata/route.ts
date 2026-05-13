import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

const JOURNAL_SCRAPER_URL = process.env.JOURNAL_SCRAPER_URL

const DOI_MAX_LEN = 512
const DOI_PATTERN = /^[\d.]{4,}\/.+$/i

function normalizeDoi(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > DOI_MAX_LEN) return null
  let s = trimmed
  if (s.toLowerCase().startsWith('doi:')) {
    s = s.slice(4).trim()
  }
  if (s.startsWith('https://doi.org/')) {
    s = s.slice('https://doi.org/'.length).trim()
  }
  if (s.startsWith('http://doi.org/')) {
    s = s.slice('http://doi.org/'.length).trim()
  }
  if (!DOI_PATTERN.test(s)) return null
  return s
}

/**
 * GET /api/journals/metadata?doi=10.xxx/yyy
 * Mem-proxy ke service journal-scraper (Crossref).
 */
export async function GET(request: NextRequest) {
  try {
    const doiRaw = request.nextUrl.searchParams.get('doi') ?? ''
    const doi = normalizeDoi(doiRaw)

    if (!doi) {
      return NextResponse.json(
        {
          error:
            'Parameter doi tidak valid. Gunakan format resmi DOI, mis. 10.1037/0003-066x.59.8.847',
        },
        { status: 400 }
      )
    }

    if (!JOURNAL_SCRAPER_URL) {
      return NextResponse.json(
        {
          error:
            'JOURNAL_SCRAPER_URL belum dikonfigurasi. Set URL service journal-scraper (mis. http://localhost:8002).',
        },
        { status: 503 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const base = JOURNAL_SCRAPER_URL.replace(/\/$/, '')
    const upstream = `${base}/metadata?doi=${encodeURIComponent(doi)}`

    const res = await fetch(upstream, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(25_000),
    })

    const text = await res.text()
    let body: unknown
    try {
      body = JSON.parse(text) as unknown
    } catch {
      return NextResponse.json(
        { error: 'Respons journal-scraper bukan JSON' },
        { status: 502 }
      )
    }

    return NextResponse.json(body, { status: res.status })
  } catch (e) {
    console.error('journals/metadata:', e)
    const msg = e instanceof Error ? e.message : 'Gagal mengambil metadata'
    if (msg.includes('timeout') || msg.includes('Timeout')) {
      return NextResponse.json(
        { error: 'Permintaan ke journal-scraper habis waktu' },
        { status: 504 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
