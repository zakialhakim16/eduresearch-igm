import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type ReferenceGapRequest = {
  document_id: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReferenceGapRequest

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
      .select(
        'id, user_id, nama_file, jenis, ai_summary, research_keywords, research_query, structure'
      )
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    const { data: references, error: referencesError } = await supabase
      .from('paper_references')
      .select(
        'id, document_id, openalex_id, judul, penulis, tahun, jurnal, doi, url, abstrak, sitasi_count, is_open_access, created_at'
      )
      .eq('document_id', document.id)
      .order('created_at', { ascending: false })
      .limit(12)

    if (referencesError) {
      return NextResponse.json(
        { error: 'Gagal mengambil referensi tersimpan' },
        { status: 500 }
      )
    }

    if (!references || references.length === 0) {
      return NextResponse.json(
        {
          error:
            'Belum ada referensi tersimpan. Simpan minimal 1 referensi dulu.',
        },
        { status: 400 }
      )
    }

    const formattedReferences = references
      .map((ref, index) => {
        const authors = ref.penulis?.length
          ? ref.penulis.join(', ')
          : 'Author tidak tersedia'

        return `
[${index + 1}] ${ref.judul}
Penulis: ${authors}
Tahun: ${ref.tahun ?? '-'}
Jurnal/Sumber: ${ref.jurnal ?? '-'}
Sitasi: ${ref.sitasi_count ?? 0}
DOI: ${ref.doi ?? '-'}
URL: ${ref.url ?? '-'}
Abstrak:
${ref.abstrak ? ref.abstrak.slice(0, 1500) : 'Abstrak tidak tersedia.'}
`.trim()
      })
      .join('\n\n')

    const prompt = `
Kamu adalah mentor riset akademik untuk mahasiswa Universitas Indo Global Mandiri.

Tugasmu:
Evaluasi apakah referensi yang sudah disimpan user cukup kuat untuk mendukung dokumen akademiknya.

ATURAN WAJIB:
- Jawab hanya dalam Bahasa Indonesia.
- Gunakan sapaan "kamu", bukan "Anda".
- Jangan mengarang isi paper di luar metadata dan abstrak yang tersedia.
- Jangan membuat sitasi palsu.
- Berikan evaluasi langsung, bukan hanya pertanyaan.
- Tetap konstruktif dan bergaya mentor riset.

Konteks dokumen:
Nama file: ${document.nama_file}
Jenis dokumen: ${document.jenis}

Ringkasan dokumen:
"""
${document.ai_summary ?? 'Belum ada ringkasan AI.'}
"""

Keyword riset:
${document.research_keywords?.join(', ') ?? '-'}

Query referensi:
${document.research_query ?? '-'}

Referensi tersimpan:
${formattedReferences}

Buat analisis dengan format berikut:

1. Penilaian Umum
Apakah referensi yang tersimpan sudah cukup kuat atau belum?

2. Referensi yang Paling Relevan
Sebutkan referensi mana yang paling relevan dan untuk bagian apa.

3. Referensi yang Kurang Relevan
Jelaskan jika ada referensi yang terlalu umum atau kurang cocok.

4. Gap Referensi
Sebutkan bagian penelitian yang masih kekurangan dukungan referensi.

5. Keyword Pencarian Lanjutan
Berikan 5-8 keyword pencarian yang lebih tepat.

6. Saran Prioritas
Sebutkan 3 langkah berikutnya yang harus dilakukan mahasiswa.
`

    let analysis: string
    try {
      analysis = await callAI(prompt, { preferFast: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI gagal menganalisis gap referensi'
      if (msg.includes('Tidak ada AI provider')) {
        return NextResponse.json({ error: msg }, { status: 503 })
      }
      console.error(err)
      return NextResponse.json(
        { error: 'AI gagal menganalisis gap referensi' },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        reference_gap_analysis: analysis,
        reference_gap_updated_at: new Date().toISOString(),
      })
      .eq('id', document.id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan analisis gap: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      reference_gap_analysis: analysis,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat analisis gap referensi' },
      { status: 500 }
    )
  }
}