const OPENALEX_URL = 'https://api.openalex.org'

export interface Paper {
  id: string
  title: string
  authors: string[]
  year: number
  journal: string
  cited_by_count: number
  abstract: string
  doi: string
  url: string
  is_open_access: boolean
}

// Extract type untuk OpenAlex response
interface OpenAlexWork {
  id: string
  title?: string
  authorships?: {
    author?: {
      display_name?: string
    }
  }[]
  publication_year: number
  primary_location?: {
    source?: {
      display_name?: string
    }
    landing_page_url?: string
  }
  cited_by_count?: number
  abstract?: string
  doi?: string
  open_access?: {
    is_oa?: boolean
  }
}

export async function searchPapers(
  query: string,
  filters?: {
    year_from?: number
    open_access?: boolean
    per_page?: number
  }
): Promise<Paper[]> {
  const params = new URLSearchParams({
    search: query,
    per_page: String(filters?.per_page || 10),
    sort: 'cited_by_count:desc',
    mailto: 'eduresearch@uigm.ac.id'
  })

  if (filters?.year_from) {
    params.append('filter', `publication_year:>${filters.year_from}`)
  }

  if (filters?.open_access) {
    params.append('filter', 'is_oa:true')
  }

  const response = await fetch(
    `${OPENALEX_URL}/works?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error('OpenAlex API error')
  }

  const data = await response.json()

  return data.results.map((work: OpenAlexWork): Paper => ({
    id: work.id,
    title: work.title || 'Judul tidak tersedia',
    authors: work.authorships
      ?.slice(0, 3)
      .map((a) => a.author?.display_name)
      .filter((name): name is string => Boolean(name)) || [],
    year: work.publication_year,
    journal: work.primary_location?.source?.display_name || 'Jurnal tidak diketahui',
    cited_by_count: work.cited_by_count || 0,
    abstract: work.abstract || 'Abstrak tidak tersedia',
    doi: work.doi || '',
    url: work.primary_location?.landing_page_url || work.id,
    is_open_access: work.open_access?.is_oa || false
  }))
}