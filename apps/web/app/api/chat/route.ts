import { NextRequest, NextResponse } from 'next/server'
import { streamWithOllama, OllamaMessage } from '@/lib/ollama'
import { getProposalSystemPrompt } from '@/lib/prompts'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type ChatRequestBody = {
  messages: ChatMessage[]
  step?: string
  sessionId?: string
}

type ChapterInfo = {
  title?: string
  word_count?: number
  start_line?: number
}

type QualityScore = {
  total?: number
  notes?: string[]
}

type DocumentStructure = {
  detected_type?: string
  word_count?: number
  chapters?: Array<string | ChapterInfo>
  references?: string[]
  keywords?: string[]
  quality?: QualityScore | null
  text_preview?: string
  message?: string
  parser_version?: string
}

type SavedReference = {
  judul: string
  penulis: string[] | null
  tahun: number | null
  jurnal: string | null
  doi: string | null
  url: string | null
  abstrak: string | null
  sitasi_count: number | null
}

const CHAT_BEHAVIOR_GUARD = `
ATURAN GLOBAL WAJIB:
- Selalu jawab dalam Bahasa Indonesia.
- Jangan pernah menggunakan Bahasa Mandarin, Chinese, Hanzi, atau bahasa lain selain Bahasa Indonesia.
- Istilah teknis bahasa Inggris seperti Support Vector Machine, feature selection, phishing, dataset, dan cross validation boleh digunakan.
- Jika user meminta evaluasi seperti "mana yang paling cocok", "referensi mana", "bagian mana", atau "apa yang harus diperkuat", berikan evaluasi langsung terlebih dahulu.
- Jangan hanya membalas dengan daftar pertanyaan.
- Format jawaban untuk evaluasi referensi:
  1. Jawaban langsung
  2. Alasan kecocokan
  3. Keterbatasan referensi
  4. Referensi tambahan yang masih perlu dicari
  5. Maksimal 2 pertanyaan Socratic lanjutan.
- Jika referensi yang tersedia kurang cocok, katakan dengan jelas dan sopan.
- Jangan mengarang isi paper di luar judul, abstrak, metadata, dan konteks yang tersedia.
- Jangan membuat sitasi palsu.
- Jika user bertanya "referensi mana yang cocok", berikan evaluasi langsung, bukan hanya pertanyaan.
- Untuk setiap referensi, nilai apakah cocok untuk:
  1. latar belakang,
  2. metode,
  3. pembahasan,
  4. atau hanya konteks umum.
- Jika referensi kurang cocok untuk metode ini, jelaskan bahwa referensi tersebut kurang spesifik.
- Untuk dokumen user ini, metode inti adalah SVM, Chi-Square feature selection, phishing website detection, dataset Kaggle, dan Stratified K-Fold Cross Validation.
- Referensi yang paling cocok untuk metode adalah referensi yang membahas langsung machine learning classification, phishing detection, feature selection, SVM, atau evaluasi model.
- Setelah evaluasi, ajukan maksimal 2 pertanyaan Socratic lanjutan.
`.trim()

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')
}

function formatChapters(chapters?: Array<string | ChapterInfo>) {
  if (!chapters || chapters.length === 0) return '-'

  return chapters
    .map((chapter) => {
      if (typeof chapter === 'string') return chapter

      const meta = []

      if (chapter.word_count !== undefined) {
        meta.push(`${chapter.word_count} kata`)
      }

      if (chapter.start_line !== undefined) {
        meta.push(`baris ${chapter.start_line}`)
      }

      return `${chapter.title ?? '-'}${meta.length > 0 ? ` (${meta.join(', ')})` : ''}` 
    })
    .join(', ')
}

function buildDocumentContext(document: {
  nama_file: string
  jenis: string
  structure: DocumentStructure | null
  ai_summary: string | null
  extracted_text: string | null
}) {
  const textPreview = document.extracted_text
    ? document.extracted_text.slice(0, 5000)
    : 'Tidak ada extracted_text.'

  return `
KONTEKS DOKUMEN USER:

Nama dokumen:
${document.nama_file}

Jenis dokumen menurut user:
${document.jenis}

Tipe terdeteksi:
${document.structure?.detected_type ?? '-'}

Jumlah kata:
${document.structure?.word_count ?? '-'}

Bagian yang terdeteksi:
${formatChapters(document.structure?.chapters)}

Keyword dari parser:
${document.structure?.keywords?.join(', ') ?? '-'}

Skor kualitas dokumen:
${document.structure?.quality?.total ?? '-'}/100

Catatan kualitas:
${document.structure?.quality?.notes?.join('; ') ?? '-'}

Ringkasan AI sebelumnya:
${document.ai_summary ?? 'Belum ada ringkasan AI.'}

Cuplikan isi dokumen:
"""
${textPreview}
"""

ATURAN KHUSUS BERDASARKAN DOKUMEN:
- Jawaban harus mempertimbangkan konteks dokumen di atas.
- Jangan memberikan saran yang terlalu umum jika dokumen sudah memberikan konteks spesifik.
- Jika user membahas metode, kaitkan dengan metode yang ada di dokumen.
- Jika user membahas topik, kaitkan dengan topik dokumen.
- Jika user membahas struktur, kaitkan dengan bagian yang terdeteksi oleh parser.
- Tetap gunakan gaya Socratic: bantu user berpikir, jangan langsung menuliskan revisi final.
`.trim()
}

function buildSavedReferencesContext(references: SavedReference[]) {
  if (references.length === 0) return ''

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
${ref.abstrak ? ref.abstrak.slice(0, 1200) : 'Abstrak tidak tersedia.'}
`.trim()
    })
    .join('\n\n')

  return `
KONTEKS REFERENSI TERSIMPAN USER:

User sudah menyimpan referensi berikut untuk dokumen ini:

${formattedReferences}

ATURAN KHUSUS BERDASARKAN REFERENSI:
- Gunakan referensi tersimpan ini untuk membantu user memperkuat argumen riset.
- Jawab dalam Bahasa Indonesia saja.
- Jangan menggunakan Bahasa Mandarin, Chinese.
- Jangan mengarang isi paper di luar judul, metadata, dan abstrak yang tersedia.
- Jangan membuat sitasi palsu.
- Jika user bertanya "referensi mana yang cocok", JANGAN hanya bertanya balik.
- Berikan evaluasi langsung, bukan hanya pertanyaan.
- Untuk setiap referensi, nilai apakah cocok untuk:
  1. latar belakang,
  2. metode,
  3. pembahasan,
  4. atau hanya konteks umum.
- Jika referensi kurang relevan untuk metode ini, jelaskan bahwa referensi tersebut kurang spesifik.
- Untuk dokumen user ini, metode inti adalah SVM, Chi-Square feature selection, phishing website detection, dataset Kaggle, dan Stratified K-Fold Cross Validation.
- Referensi yang paling cocok untuk metode adalah referensi yang membahas langsung machine learning classification, phishing detection, feature selection, SVM, atau evaluasi model.
- Setelah evaluasi, ajukan maksimal 2 pertanyaan Socratic lanjutan.
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, step, sessionId } = (await req.json()) as ChatRequestBody

    const { data: profile } = await supabase
      .from('users')
      .select('jenjang, prodi')
      .eq('id', user.id)
      .single()

    let documentContext = ''
    let savedReferencesContext = ''

    if (sessionId) {
      const { data: session } = await supabase
        .from('sessions')
        .select('id, user_id, document_id, modul')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (session?.document_id) {
        const { data: document } = await supabase
          .from('documents')
          .select('nama_file, jenis, structure, ai_summary, extracted_text')
          .eq('id', session.document_id)
          .eq('user_id', user.id)
          .single()

        if (document) {
          documentContext = buildDocumentContext(document)
        }

        const { data: savedReferences } = await supabase
          .from('paper_references')
          .select(
            'judul, penulis, tahun, jurnal, doi, url, abstrak, sitasi_count'
          )
          .eq('user_id', user.id)
          .eq('document_id', session.document_id)
          .order('created_at', { ascending: false })
          .limit(8)

        if (savedReferences && savedReferences.length > 0) {
          savedReferencesContext = buildSavedReferencesContext(savedReferences)
        }
      }
    }

    const baseSystemPrompt = getProposalSystemPrompt(
      profile?.jenjang || 'S1',
      profile?.prodi || 'Teknik Informatika',
      step || 'eksplorasi_topik'
    )

    const systemPrompt = [
      baseSystemPrompt,
      documentContext,
      savedReferencesContext,
      CHAT_BEHAVIOR_GUARD,
    ]
      .filter(Boolean)
      .join('\n\n')

    const lastUserMessage = getLastUserMessage(messages)

    if (sessionId && lastUserMessage) {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        content: lastUserMessage.content,
        model_used: null,
        tokens_used: 0,
      })
    }

    const fullMessages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    const ollamaStream = await streamWithOllama(fullMessages)

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const reader = ollamaStream.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(Boolean)

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line)

                if (parsed.message?.content) {
                  fullResponse += parsed.message.content

                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        content: parsed.message.content,
                      })}\n\n`
                    )
                  )
                }
              } catch {
                // Abaikan line yang bukan JSON valid
              }
            }
          }

          if (sessionId && fullResponse.trim()) {
            await supabase.from('messages').insert({
              session_id: sessionId,
              role: 'assistant',
              content: fullResponse,
              model_used: 'qwen2.5:7b',
              tokens_used: 0,
            })
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
