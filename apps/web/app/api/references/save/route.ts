import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type SaveReferenceRequest = {
  document_id: string
  reference: {
    openalex_id: string
    title: string
    year: number | null
    doi: string | null
    authors: string[]
    journal: string | null
    cited_by_count: number
    url: string | null
    abstract: string
    is_open_access: boolean
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveReferenceRequest

    if (!body.document_id) {
      return NextResponse.json(
        { error: 'document_id wajib dikirim' },
        { status: 400 }
      )
    }

    if (!body.reference?.openalex_id || !body.reference?.title) {
      return NextResponse.json(
        { error: 'Data referensi tidak lengkap' },
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
      .select('id, user_id')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    const { error: insertError } = await supabase
      .from('paper_references')
      .upsert(
        {
          user_id: user.id,
          document_id: body.document_id,
          openalex_id: body.reference.openalex_id,
          judul: body.reference.title,
          penulis: body.reference.authors,
          tahun: body.reference.year,
          jurnal: body.reference.journal,
          doi: body.reference.doi,
          url: body.reference.url,
          abstrak: body.reference.abstract,
          sitasi_count: body.reference.cited_by_count,
          is_open_access: body.reference.is_open_access,
        },
        {
          onConflict: 'user_id,document_id,openalex_id',
        }
      )

    if (insertError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan referensi: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Referensi berhasil disimpan',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyimpan referensi' },
      { status: 500 }
    )
  }
}