import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type SummarizeRequest = {
  document_id: string
}

type OllamaResponse = {
  response: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SummarizeRequest

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
      .select('id, user_id, nama_file, jenis, extracted_text')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!document.extracted_text) {
      return NextResponse.json(
        { error: 'Dokumen belum memiliki extracted_text. Analisis dokumen dulu.' },
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

    const textLimit = document.extracted_text.slice(0, 8000)

    const prompt = `
Kamu adalah mentor riset akademik untuk mahasiswa Universitas Indo Global Mandiri.

Tugasmu adalah membaca isi dokumen akademik berikut dan membuat ringkasan analitis.

ATURAN:
- Jangan menulis ulang isi dokumen menjadi artikel baru.
- Jangan membuat klaim yang tidak ada di dokumen.
- Gunakan Bahasa Indonesia yang jelas.
- Fokus pada pemahaman isi dokumen.
- Berikan insight yang membantu mahasiswa memahami posisi dokumennya.

Informasi dokumen:
Nama file: ${document.nama_file}
Jenis dokumen menurut user: ${document.jenis}

Isi dokumen:
"""
${textLimit}
"""

Buat output dengan format berikut:

1. Ringkasan Singkat
Jelaskan isi utama dokumen dalam 3-5 kalimat.

2. Topik Utama
Sebutkan topik atau fokus penelitian.

3. Tujuan Penelitian
Jelaskan tujuan yang terlihat dari dokumen.

4. Metode / Pendekatan
Jelaskan metode yang digunakan jika ada.

5. Poin Penting
Buat 3-5 poin penting dari dokumen.

6. Kelemahan atau Bagian yang Perlu Diperkuat
Berikan catatan kritis, tapi tetap konstruktif.

7. Pertanyaan Socratic untuk Mahasiswa
Buat 3 pertanyaan yang mendorong mahasiswa memahami dokumennya sendiri.
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
        { error: 'Ollama gagal membuat ringkasan' },
        { status: 500 }
      )
    }

    const ollamaJson = (await ollamaResponse.json()) as OllamaResponse
    const aiSummary = ollamaJson.response

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        ai_summary: aiSummary,
      })
      .eq('id', document.id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan AI summary: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      ai_summary: aiSummary,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat ringkasan AI' },
      { status: 500 }
    )
  }
}