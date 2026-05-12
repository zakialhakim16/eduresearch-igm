import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type AnalyzeRequest = {
  document_id: string
}

type ChapterInfo = {
  title: string
  word_count: number
  start_line: number
}

type QualityScore = {
  total: number
  has_abstract: boolean
  has_chapters: boolean
  has_references: boolean
  has_methodology: boolean
  word_count_adequate: boolean
  notes: string[]
}

type RustParseFileResponse = {
  document_id: string
  status: string
  detected_type: string
  word_count: number
  chapters: ChapterInfo[]
  references?: string[]
  keywords?: string[]
  quality?: QualityScore
  text_preview: string
  extracted_text: string
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    if (!document.storage_path) {
      return NextResponse.json(
        { error: 'Dokumen tidak memiliki storage_path' },
        { status: 400 }
      )
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        { error: 'Gagal mengambil file dari storage' },
        { status: 500 }
      )
    }

    const parserUrl = process.env.DOC_PARSER_URL

    if (!parserUrl) {
      return NextResponse.json(
        { error: 'DOC_PARSER_URL belum diset di .env.local' },
        { status: 500 }
      )
    }

    const formData = new FormData()
    formData.append('document_id', document.id)
    formData.append('file_name', document.nama_file)
    formData.append('mime_type', document.mime_type ?? 'application/pdf')
    formData.append('file', fileBlob, document.nama_file)

    const parserResponse = await fetch(`${parserUrl}/parse-file`, {
      method: 'POST',
      body: formData,
    })

    const parserJson = await parserResponse.json()

    if (!parserResponse.ok) {
      return NextResponse.json(
        { error: parserJson.error ?? 'Rust doc-parser gagal memproses file' },
        { status: 500 }
      )
    }

    const parseResult = parserJson as RustParseFileResponse

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: parseResult.status,
        extracted_text: parseResult.extracted_text,
        structure: {
          detected_type: parseResult.detected_type,
          word_count: parseResult.word_count,
          chapters: parseResult.chapters ?? [],
          references: parseResult.references ?? [],
          keywords: parseResult.keywords ?? [],
          quality: parseResult.quality ?? null,
          text_preview: parseResult.text_preview,
          message: parseResult.message,
          parser_version: 'doc-parser-v2',
        },
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
      result: {
        detected_type: parseResult.detected_type,
        word_count: parseResult.word_count,
        chapters: parseResult.chapters ?? [],
        references: parseResult.references ?? [],
        keywords: parseResult.keywords ?? [],
        quality: parseResult.quality ?? null,
        text_preview: parseResult.text_preview,
        message: parseResult.message,
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat analisis dokumen' },
      { status: 500 }
    )
  }
}
