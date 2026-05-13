import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type RecommendRequest = {
  document_id: string
}

type OpenAlexWork = {
  id: string
  doi: string | null
  title: string
  publication_year: number | null
  cited_by_count: number
  abstract_inverted_index?: Record<string, number[]> | null
  authorships?: {
    author?: {
      display_name?: string
    }
  }[]
  primary_location?: {
    landing_page_url?: string | null
    source?: {
      display_name?: string | null
    } | null
  } | null
  open_access?: {
    oa_url?: string | null
    is_oa?: boolean
  } | null
}

function abstractFromInvertedIndex(index?: Record<string, number[]> | null) {
  if (!index) return ''

  const words: { word: string; position: number }[] = []

  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words.push({ word, position })
    }
  }

  return words
    .sort((a, b) => a.position - b.position)
    .map((item) => item.word)
    .join(' ')
}

function normalizeQuery(query: string) {
  return query.replace(/\s+/g, ' ').trim()
}

function buildSearchQueries(
  researchQuery: string | null,
  keywords: string[] | null
): string[] {
  const safeKeywords = keywords ?? []
  const queries: string[] = []

  if (researchQuery) queries.push(researchQuery)
  if (safeKeywords.length >= 5) queries.push(safeKeywords.slice(0, 5).join(' '))
  if (safeKeywords.length >= 4) queries.push(safeKeywords.slice(0, 4).join(' '))
  if (safeKeywords.length >= 3) queries.push(safeKeywords.slice(0, 3).join(' '))
  if (safeKeywords.length >= 2) queries.push(safeKeywords.slice(1, 4).join(' '))
  if (queries.length === 0 && safeKeywords.length > 0) {
    queries.push(safeKeywords.join(' '))
  }

  return Array.from(new Set(queries.filter(Boolean).map((q) => normalizeQuery(q))))
}

async function searchOpenAlex(query: string) {
  const openAlexUrl = new URL('https://api.openalex.org/works')

  openAlexUrl.searchParams.set('search', query)
  openAlexUrl.searchParams.set('per-page', '15')
  openAlexUrl.searchParams.set('sort', 'relevance_score:desc')

  const response = await fetch(openAlexUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil referensi dari OpenAlex')
  }

  const json = await response.json()
  const works = (json.results ?? []) as OpenAlexWork[]

  return works
}

function mapOpenAlexWorks(works: OpenAlexWork[]) {
  return works.map((work) => {
    const authors =
      work.authorships
        ?.map((item) => item.author?.display_name)
        .filter(Boolean)
        .slice(0, 5) ?? []

    return {
      openalex_id: work.id,
      title: work.title,
      year: work.publication_year,
      doi: work.doi,
      authors,
      journal: work.primary_location?.source?.display_name ?? null,
      cited_by_count: work.cited_by_count,
      url:
        work.open_access?.oa_url ??
        work.primary_location?.landing_page_url ??
        work.doi,
      abstract: abstractFromInvertedIndex(work.abstract_inverted_index),
      is_open_access: work.open_access?.is_oa ?? false,
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendRequest

    if (!body.document_id) {
      return NextResponse.json(
        { error: 'document_id wajib dikirim' },
        { status: 400 }
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

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, user_id, nama_file, research_keywords, research_query')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!document.research_query && !document.research_keywords?.length) {
      return NextResponse.json(
        { error: 'Dokumen belum memiliki keywords. Jalankan ekstrak keyword dulu.' },
        { status: 400 }
      )
    }

    const searchQueries = buildSearchQueries(
      document.research_query,
      document.research_keywords
    )

    if (searchQueries.length === 0) {
      return NextResponse.json(
        {
          error:
            'Dokumen belum memiliki research_query. Jalankan ekstrak keyword dulu.',
        },
        { status: 400 }
      )
    }

    let allReferences: ReturnType<typeof mapOpenAlexWorks> = []
    const triedQueries: string[] = []

    for (const query of searchQueries) {
      triedQueries.push(query)

      const works = await searchOpenAlex(query)
      const mapped = mapOpenAlexWorks(works)

      allReferences = [...allReferences, ...mapped]

      // Kalau sudah cukup banyak, stop agar tidak terlalu banyak request
      if (allReferences.length >= 25) {
        break
      }
    }

    // Hapus duplikat berdasarkan OpenAlex ID
    const uniqueReferences = Array.from(
      new Map(
        allReferences.map((reference) => [
          reference.openalex_id,
          reference,
        ])
      ).values()
    )

    // Ranking sederhana:
    // 1. Ada abstract lebih bagus
    // 2. Tahun terbaru lebih bagus
    // 3. Sitasi lebih tinggi lebih bagus
    const references = uniqueReferences
      .sort((a, b) => {
        const aScore =
          (a.abstract ? 20 : 0) +
          (a.year ? Math.max(0, a.year - 2018) : 0) +
          Math.min(a.cited_by_count ?? 0, 100)

        const bScore =
          (b.abstract ? 20 : 0) +
          (b.year ? Math.max(0, b.year - 2018) : 0) +
          Math.min(b.cited_by_count ?? 0, 100)

        return bScore - aScore
      })
      .slice(0, 15)

    return NextResponse.json({
      success: true,
      document_id: document.id,
      query: triedQueries[0],
      tried_queries: triedQueries,
      references,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mencari referensi' },
      { status: 500 }
    )
  }
}
