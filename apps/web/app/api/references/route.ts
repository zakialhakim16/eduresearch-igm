import { NextRequest, NextResponse } from 'next/server'
import { searchPapers } from '@/lib/openalex'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type SaveReferenceBody = {
  paper?: {
    id?: string
    openalex_id?: string
    title?: string
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
  sessionId?: string
  document_id?: string
}

export async function GET(req: NextRequest) {
  try {
    // Cek auth
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil query params
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') ?? searchParams.get('query')
    const yearFrom = searchParams.get('year_from')
    const openAccess = searchParams.get('open_access')
    const perPage = searchParams.get('per_page')

    if (!query) {
      return NextResponse.json(
        { error: 'Parameter q atau query wajib diisi' },
        { status: 400 }
      )
    }

    // Search papers
    const papers = await searchPapers(query, {
      year_from: yearFrom ? parseInt(yearFrom) : 2019,
      open_access: openAccess === 'true',
      per_page: perPage ? parseInt(perPage) : 10
    })

    return NextResponse.json({ papers })

  } catch (error) {
    console.error('Reference search error:', error)
    return NextResponse.json(
      { error: 'Gagal mencari referensi' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Simpan referensi ke library user
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paper, sessionId, document_id } =
      (await req.json()) as SaveReferenceBody

    const openAlexId = paper?.openalex_id ?? paper?.id
    const title = paper?.title?.trim()

    if (!paper || !openAlexId || !title) {
      return NextResponse.json(
        { error: 'Data paper tidak lengkap' },
        { status: 400 }
      )
    }

    let sessionDocumentId: string | null = null

    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, document_id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Sesi tidak ditemukan' },
          { status: 404 }
        )
      }

      sessionDocumentId = session.document_id
    }

    const documentId = document_id ?? sessionDocumentId

    if (!documentId) {
      return NextResponse.json(
        { error: 'document_id wajib dikirim untuk menyimpan referensi' },
        { status: 400 }
      )
    }

    if (sessionDocumentId && sessionDocumentId !== documentId) {
      return NextResponse.json(
        { error: 'Sesi dan dokumen tidak cocok' },
        { status: 400 }
      )
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('paper_references')
      .upsert(
        {
          user_id: user.id,
          document_id: document.id,
          session_id: sessionDocumentId === document.id ? sessionId : null,
          openalex_id: openAlexId,
          judul: title,
          penulis: paper.authors ?? [],
          tahun: paper.year ?? paper.publication_year ?? null,
          jurnal: paper.journal ?? paper.source ?? null,
          doi: paper.doi,
          url: paper.url,
          abstrak: paper.abstract,
          sitasi_count: paper.cited_by_count ?? 0,
          is_open_access: paper.is_open_access ?? false,
        },
        {
          onConflict: 'user_id,document_id,openalex_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ reference: data })

  } catch (error) {
    console.error('Save reference error:', error)
    return NextResponse.json(
      { error: 'Gagal simpan referensi' },
      { status: 500 }
    )
  }
}
