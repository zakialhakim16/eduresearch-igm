import { NextRequest, NextResponse } from 'next/server'
import {
  streamAI,
  createTrackingStream,
  AIMessage,
  getStreamingModelUsedLabel,
} from '@/lib/ai'
import { getProposalSystemPrompt, buildChatBehaviorGuard } from '@/lib/prompts'
import { makeSessionTitle } from '@/lib/session-title'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ChatRequestBody = {
  messages?: unknown
  step?: unknown
  sessionId?: unknown
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

type SessionDocumentRow = {
  nama_file: string
  jenis: string
  structure: DocumentStructure | null
  ai_summary: string | null
  extracted_text: string | null
  research_keywords: string[] | null
  research_query: string | null
}

const CHAT_BEHAVIOR_GUARD_GENERAL = `
ATURAN GLOBAL WAJIB:
- Selalu jawab dalam Bahasa Indonesia.
- Gunakan sapaan "kamu", bukan "Anda".
- Jangan pernah menggunakan Bahasa Mandarin, Chinese, Hanzi, atau bahasa lain selain Bahasa Indonesia.
- Istilah teknis bahasa Inggris boleh dipakai jika relevan dengan apa yang user sebutkan.
- Gunakan format Markdown yang rapi agar mudah dibaca.
- Untuk jawaban panjang, gunakan heading singkat.
- Jangan terlalu banyak memakai bold.
- Jika user meminta evaluasi, berikan evaluasi langsung terlebih dahulu.
- Jangan hanya membalas dengan daftar pertanyaan.
- Jika user meminta rekomendasi judul tetapi belum menyebut minat, tanyakan dulu bidang minat, jenis penelitian, dan masalah yang ingin diselesaikan.
`.trim()

const NEW_GUIDANCE_GUARD = `
MODE BIMBINGAN BARU:
- Ini adalah sesi baru tanpa dokumen.
- Jangan gunakan konteks dokumen lama.
- Jangan gunakan referensi lama.
- Jangan menyebut topik penelitian spesifik kecuali user menyebutnya sendiri.
- Jika user meminta rekomendasi judul skripsi tapi belum menyebut bidang minat, jangan langsung memberi judul final.
- Tanyakan dulu minat bidang, jenis penelitian, masalah yang ingin diselesaikan, dan preferensi metode.
- Jika ingin memberi contoh, berikan contoh yang beragam dari beberapa bidang, bukan hanya satu topik.
- Gunakan sapaan "kamu", bukan "Anda".
`.trim()

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')
}

function sanitizeClientMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return []

  return messages.flatMap((message): ChatMessage[] => {
    if (!message || typeof message !== 'object') return []

    const candidate = message as { role?: unknown; content?: unknown }

    if (candidate.role !== 'user' && candidate.role !== 'assistant') return []
    if (typeof candidate.content !== 'string') return []

    const content = candidate.content.trim()
    if (!content) return []

    return [
      {
        role: candidate.role,
        content,
      },
    ]
  })
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

function buildDocumentContext(document: SessionDocumentRow) {
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
- Jika referensi kurang relevan dengan fokus dokumen user, jelaskan dengan sopan.
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

    const body = (await req.json()) as ChatRequestBody
    const messages = sanitizeClientMessages(body.messages)
    const step = typeof body.step === 'string' ? body.step : undefined
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim()
        : null

    const lastUserMessage = getLastUserMessage(messages)

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: 'Pesan user wajib dikirim' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('users')
      .select('jenjang, prodi')
      .eq('id', user.id)
      .single()

    let documentContext = ''
    let savedReferencesContext = ''
    let sessionDocument: SessionDocumentRow | null = null
    let canonicalMessages: AIMessage[] = messages

    if (sessionId) {
      const { data: session } = await supabase
        .from('sessions')
        .select('id, user_id, document_id, modul, title')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (!session) {
        return NextResponse.json(
          { error: 'Sesi tidak ditemukan' },
          { status: 404 }
        )
      }

      if (session?.document_id) {
        const { data: document } = await supabase
          .from('documents')
          .select(
            'nama_file, jenis, structure, ai_summary, extracted_text, research_keywords, research_query'
          )
          .eq('id', session.document_id)
          .eq('user_id', user.id)
          .single()

        if (document) {
          sessionDocument = document as SessionDocumentRow
          documentContext = buildDocumentContext(sessionDocument)
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

      // Judul otomatis untuk sesi tanpa dokumen (mis. masih "Bimbingan Baru")
      if (
        session &&
        !session.document_id &&
        lastUserMessage &&
        (!session.title?.trim() || session.title === 'Bimbingan Baru')
      ) {
        const nextTitle = makeSessionTitle(lastUserMessage.content)
        await supabase
          .from('sessions')
          .update({ title: nextTitle })
          .eq('id', sessionId)
          .eq('user_id', user.id)
      }

      const { data: storedMessages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(60)

      const persistedMessages = sanitizeClientMessages(storedMessages)
      canonicalMessages = [...persistedMessages, lastUserMessage]
    }

    const baseSystemPrompt = getProposalSystemPrompt(
      profile?.jenjang || 'S1',
      profile?.prodi || 'Teknik Informatika',
      step || 'eksplorasi_topik'
    )

    const behaviorGuard = buildChatBehaviorGuard({
      keywords: sessionDocument?.research_keywords ?? null,
      researchQuery: sessionDocument?.research_query ?? null,
      docType: (sessionDocument?.structure as DocumentStructure)?.detected_type ?? null,
    })

    const systemPrompt = sessionId
      ? [
          baseSystemPrompt,
          documentContext,
          savedReferencesContext,
          behaviorGuard,
        ]
          .filter(Boolean)
          .join('\n\n')
      : [baseSystemPrompt, NEW_GUIDANCE_GUARD, CHAT_BEHAVIOR_GUARD_GENERAL]
          .filter(Boolean)
          .join('\n\n')

    if (sessionId && lastUserMessage) {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        content: lastUserMessage.content,
        model_used: null,
        tokens_used: 0,
      })
    }

    const modelUsedLabel = await getStreamingModelUsedLabel()
    const aiStream = await streamAI(canonicalMessages, systemPrompt)
    const trackedStream = createTrackingStream(aiStream, async (fullText) => {
      if (sessionId && fullText.trim()) {
        await supabase.from('messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: fullText,
          model_used: modelUsedLabel,
          tokens_used: 0,
        })
      }
    })

    return new Response(trackedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat error:', error)

    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message.includes('Tidak ada AI provider')) {
      return NextResponse.json({ error: message }, { status: 503 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
