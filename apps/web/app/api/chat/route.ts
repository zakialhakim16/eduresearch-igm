import { NextRequest, NextResponse } from 'next/server'
import { streamWithOllama, OllamaMessage } from '@/lib/ollama'
import { getProposalSystemPrompt } from '@/lib/prompts'
import { createServerSupabaseClient } from '@/lib/supabase.server'

export async function POST(req: NextRequest) {
  try {
    // Cek auth
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil profil user
    const { data: profile } = await supabase
      .from('users')
      .select('jenjang, prodi')
      .eq('id', user.id)
      .single()

    const { messages, step, sessionId } = await req.json()

    // Build system prompt
    const systemPrompt = getProposalSystemPrompt(
      profile?.jenjang || 'S1',
      profile?.prodi || 'Teknik Informatika',
      step || 'eksplorasi_topik'
    )

    // Tambah system prompt ke messages
    const fullMessages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    // Stream dari Ollama
    const ollamaStream = await streamWithOllama(fullMessages)

    // Transform stream ke format yang bisa dibaca frontend
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
                    encoder.encode(`data: ${JSON.stringify({
                      content: parsed.message.content
                    })}\n\n`)
                  )
                }
              } catch {}
            }
          }

          // Simpan pesan ke database
          if (sessionId) {
            await supabase.from('messages').insert([
              {
                session_id: sessionId,
                role: 'assistant',
                content: fullResponse,
                model_used: 'qwen2.5:7b'
              }
            ])
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}