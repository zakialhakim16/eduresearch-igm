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

type DocumentStructure = {
  detected_type?: string
  word_count?: number
  chapters?: string[]
  text_preview?: string
  message?: string
}

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')
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
${document.structure?.chapters?.join(', ') ?? '-'}

Ringkasan AI sebelumnya:
${document.ai_summary ?? 'Belum ada ringkasan AI.'}

Cuplikan isi dokumen:
"""
${textPreview}
"""

ATURAN KHUSUS BERDASARKAN DOKUMEN:
- Jawaban harus mempertimbangkan konteks dokumen di atas.
- Jangan memberikan saran yang terlalu umum jika dokumen sudah memberi konteks spesifik.
- Jika user membahas metode, kaitkan dengan metode yang ada di dokumen.
- Jika user membahas topik, kaitkan dengan topik dokumen.
- Jika user membahas referensi, kaitkan dengan kelemahan atau kebutuhan referensi dalam dokumen.
- Tetap gunakan gaya Socratic: bantu user berpikir, jangan langsung menuliskan revisi final.
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
      }
    }

    const baseSystemPrompt = getProposalSystemPrompt(
      profile?.jenjang || 'S1',
      profile?.prodi || 'Teknik Informatika',
      step || 'eksplorasi_topik'
    )

    const systemPrompt = documentContext
      ? `${baseSystemPrompt}\n\n${documentContext}`
      : baseSystemPrompt

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