import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type ExtractKeywordsRequest = {
  document_id: string
}

type OllamaResponse = {
  response: string
}

type KeywordResult = {
  keywords: string[]
  research_query: string
}

function extractJsonFromText(text: string): KeywordResult | null {
  try {
    return JSON.parse(text) as KeywordResult
  } catch {}

  const match = text.match(/\{[\s\S]*\}/)

  if (!match) return null

  try {
    return JSON.parse(match[0]) as KeywordResult
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExtractKeywordsRequest

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
      .select('id, user_id, nama_file, jenis, ai_summary, extracted_text, structure')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!document.ai_summary && !document.extracted_text) {
      return NextResponse.json(
        { error: 'Dokumen belum memiliki ringkasan atau extracted_text' },
        { status: 400 }
      )
    }

    const ollamaUrl = process.env.OLLAMA_URL

    if (!ollamaUrl) {
      return NextResponse.json(
        { error: 'OLLAMA_URL belum diset di .env.local' },
        { status: 500 }
      )
    }

    const textContext = document.extracted_text
      ? document.extracted_text.slice(0, 7000)
      : ''

    const prompt = `
Kamu adalah asisten riset akademik.

Tugasmu:
Ekstrak keyword riset dari dokumen akademik berikut untuk keperluan pencarian referensi di OpenAlex/Semantic Scholar.

ATURAN:
- Jangan membuat penjelasan panjang.
- Jangan gunakan markdown.
- Jangan gunakan bullet point.
- Output HARUS berupa JSON valid.
- Keyword boleh Bahasa Inggris karena akan dipakai untuk search paper internasional.
- Buat keyword spesifik, bukan terlalu umum.

Dokumen:
Nama file: ${document.nama_file}
Jenis: ${document.jenis}

Ringkasan AI:
"""
${document.ai_summary ?? ''}
"""

Cuplikan isi dokumen:
"""
${textContext}
"""

Format output wajib:

{
  "keywords": [
    "keyword 1",
    "keyword 2",
    "keyword 3",
    "keyword 4",
    "keyword 5"
  ],
  "research_query": "keyword utama gabungan untuk search paper"
}
`

    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        prompt,
        stream: false,
      }),
    })

    if (!ollamaResponse.ok) {
      return NextResponse.json(
        { error: 'Ollama gagal mengekstrak keyword' },
        { status: 500 }
      )
    }

    const ollamaJson = (await ollamaResponse.json()) as OllamaResponse
    const parsed = extractJsonFromText(ollamaJson.response)

    if (!parsed || !Array.isArray(parsed.keywords)) {
      return NextResponse.json(
        {
          error: 'Format hasil AI tidak valid',
          raw_response: ollamaJson.response,
        },
        { status: 500 }
      )
    }

    const keywords = parsed.keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 10)

    const researchQuery =
      parsed.research_query?.trim() || keywords.slice(0, 5).join(' ')

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        research_keywords: keywords,
        research_query: researchQuery,
      })
      .eq('id', document.id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan keyword: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      keywords,
      research_query: researchQuery,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat ekstrak keyword' },
      { status: 500 }
    )
  }
}