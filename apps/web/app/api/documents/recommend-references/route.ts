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
  return query
    .replace(/kfold/gi, 'k-fold')
    .replace(/chi square/gi, 'chi-square')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildFallbackQueries(
  researchQuery: string | null,
  keywords: string[] | null
) {
  const safeKeywords = keywords ?? []

  const queries = [
    researchQuery,
    safeKeywords.slice(0, 5).join(' '),
    safeKeywords.slice(0, 4).join(' '),
    safeKeywords.slice(0, 3).join(' '),
    'support vector machine chi-square phishing',
    'phishing website detection support vector machine',
    'chi-square feature selection phishing detection',
    'support vector machine phishing website',
    'machine learning phishing website detection',
    'phishing detection fintech cybersecurity',
  ]
    .filter(Boolean)
    .map((query) => normalizeQuery(query as string))

  return Array.from(new Set(queries))
}

async function searchOpenAlex(query: string) {
  const openAlexUrl = new URL('https://api.openalex.org/works')

  openAlexUrl.searchParams.set('search', query)
  openAlexUrl.searchParams.set('per-page', '10')
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

    const fallbackQueries = buildFallbackQueries(
      document.research_query,
      document.research_keywords
    )

    if (fallbackQueries.length === 0) {
      return NextResponse.json(
        {
          error:
            'Dokumen belum memiliki research_query. Jalankan ekstrak keyword dulu.',
        },
        { status: 400 }
      )
    }

    let references: ReturnType<typeof mapOpenAlexWorks> = []
    let queryUsed = ''
    const triedQueries: string[] = []

    for (const query of fallbackQueries) {
      triedQueries.push(query)

      const works = await searchOpenAlex(query)

      if (works.length > 0) {
        references = mapOpenAlexWorks(works)
        queryUsed = query
        break
      }
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      query: queryUsed,
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