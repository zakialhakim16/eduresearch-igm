import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type AnalyzeRequest = {
  document_id: string
}

type RustParseResponse = {
  document_id: string
  status: string
  detected_type: string
  word_count: number
  chapters: string[]
  message: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, user_id, nama_file, storage_path, mime_type')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    const parserUrl = process.env.DOC_PARSER_URL

    if (!parserUrl) {
      return NextResponse.json(
        { error: 'DOC_PARSER_URL belum diset di .env.local' },
        { status: 500 }
      )
    }

    const parserResponse = await fetch(`${parserUrl}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: document.id,
        file_name: document.nama_file,
        storage_path: document.storage_path,
        mime_type: document.mime_type,
      }),
    })

    if (!parserResponse.ok) {
      return NextResponse.json(
        { error: 'Rust doc-parser gagal memproses dokumen' },
        { status: 500 }
      )
    }

    const parseResult = (await parserResponse.json()) as RustParseResponse

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: parseResult.status,
        structure: parseResult,
      })
      .eq('id', document.id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal update hasil analisis: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      result: parseResult,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat analisis dokumen' },
      { status: 500 }
    )
  }
}