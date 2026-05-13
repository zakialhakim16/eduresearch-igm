export class ResearchBrainUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResearchBrainUnavailableError'
  }
}

export type ResearchBrainPaper = {
  source_id: string | null
  doi: string | null
  title: string
  year: number | null
  journal: string | null
  authors: string[]
  abstract: string | null
  url: string | null
  cited_by_count: number
  open_access: boolean
  score: number
  match_reason: string[]
}

export type RecommendPapersResponse = {
  input_summary: string
  tried_queries: string[]
  total: number
  results: ResearchBrainPaper[]
}

export type ProposalScoreResponse = {
  total_score: number
  max_score: number
  verdict: string
  rubric: Array<{
    name: string
    score: number
    max_score: number
    notes: string[]
  }>
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export type TopicClassifyResponse = {
  primary_topic: string
  confidence: number
  matched_keywords: string[]
  alternative_topics: string[]
}

export type ResearchMapResponse = {
  total_items: number
  top_topics: Array<{ key: string; count: number }>
  top_methods: Array<{ key: string; count: number }>
  top_keywords: Array<{ key: string; count: number }>
  year_distribution: Array<{ key: string; count: number }>
}

export type BrainJobResponse = {
  job_id: string
  status: string
  message: string
  progress: number
}

export function isResearchBrainUnavailable(
  error: unknown
): error is ResearchBrainUnavailableError {
  return error instanceof ResearchBrainUnavailableError
}

export async function callResearchBrain<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const baseUrl = process.env.RESEARCH_BRAIN_URL?.trim()

  if (!baseUrl) {
    throw new ResearchBrainUnavailableError('RESEARCH_BRAIN_URL belum dikonfigurasi')
  }

  const timeoutMs = init?.timeoutMs ?? 15000
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const headers = new Headers(init?.headers)

  headers.set('Accept', 'application/json')

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText)
      throw new ResearchBrainUnavailableError(
        `Research Brain error ${response.status}: ${message || response.statusText}`
      )
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ResearchBrainUnavailableError) throw error

    const message = error instanceof Error ? error.message : 'Tidak bisa menghubungi Research Brain'
    throw new ResearchBrainUnavailableError(message)
  } finally {
    clearTimeout(timeout)
  }
}
