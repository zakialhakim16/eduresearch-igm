/**
 * AI Provider untuk EduResearch AI
 * Strategy: Ollama (primary/gratis) → Claude API (fallback/production)
 */

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

const OLLAMA_URL = process.env.OLLAMA_URL
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'
const CLAUDE_CHAT_MODEL = 'claude-sonnet-4-6'
const CLAUDE_FAST_MODEL = 'claude-haiku-4-5-20251001'

/** Label penyimpanan pesan: sesuai provider yang dipakai streaming. */
export async function getStreamingModelUsedLabel(): Promise<string> {
  if (await isOllamaAvailable()) return OLLAMA_MODEL
  if (ANTHROPIC_API_KEY) return CLAUDE_CHAT_MODEL
  return OLLAMA_MODEL
}

// Health check — cek apakah Ollama bisa dihubungi
async function isOllamaAvailable(): Promise<boolean> {
  if (!OLLAMA_URL) return false
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  } catch {
    return false
  }
}

// Non-streaming — untuk summarize, extract-keywords, reference-gap
export async function callAI(
  prompt: string,
  options?: { preferFast?: boolean; systemPrompt?: string }
): Promise<string> {
  const ollamaAvailable = await isOllamaAvailable()

  if (ollamaAvailable) {
    return callOllama(prompt, options?.systemPrompt)
  }
  if (ANTHROPIC_API_KEY) {
    return callClaude(
      prompt,
      options?.preferFast ? CLAUDE_FAST_MODEL : CLAUDE_CHAT_MODEL,
      options?.systemPrompt
    )
  }
  throw new Error(
    'Tidak ada AI provider. Set OLLAMA_URL atau ANTHROPIC_API_KEY di .env.local'
  )
}

// Streaming — untuk chat Socratic
export async function streamAI(
  messages: AIMessage[],
  systemPrompt: string
): Promise<ReadableStream> {
  const ollamaAvailable = await isOllamaAvailable()

  if (ollamaAvailable) return streamOllama(messages, systemPrompt)
  if (ANTHROPIC_API_KEY) return streamClaude(messages, systemPrompt)

  throw new Error(
    'Tidak ada AI provider. Set OLLAMA_URL atau ANTHROPIC_API_KEY di .env.local'
  )
}

// Tracking stream — wrap stream untuk simpan full response ke DB
export function createTrackingStream(
  sourceStream: ReadableStream,
  onComplete: (fullText: string) => void
): ReadableStream {
  const encoder = new TextEncoder()
  let fullResponse = ''

  return new ReadableStream({
    async start(controller) {
      const reader = sourceStream.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(Boolean)
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data) as { content?: string }
              if (parsed.content) fullResponse += parsed.content
            } catch {
              /* skip */
            }
          }
          controller.enqueue(encoder.encode(chunk))
        }
        onComplete(fullResponse)
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

// ── Provider: Ollama ──────────────────────────────────────────────────────────

async function callOllama(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
  })
  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)
  const data = (await response.json()) as { message?: { content?: string } }
  return data.message?.content ?? ''
}

async function streamOllama(
  messages: AIMessage[],
  systemPrompt: string
): Promise<ReadableStream> {
  const ollamaMessages = [{ role: 'system', content: systemPrompt }, ...messages]
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: ollamaMessages,
      stream: true,
    }),
  })
  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)

  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n').filter(Boolean)) {
            try {
              const parsed = JSON.parse(line) as {
                message?: { content?: string }
              }
              if (parsed.message?.content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: parsed.message.content })}\n\n`
                  )
                )
              }
            } catch {
              /* skip */
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

// ── Provider: Claude API (fallback) ──────────────────────────────────────────

async function callClaude(
  prompt: string,
  model: string,
  systemPrompt?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  }
  if (systemPrompt) body.system = systemPrompt

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Claude API error ${response.status}`)
  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }
  return data.content?.[0]?.text ?? ''
}

async function streamClaude(
  messages: AIMessage[],
  systemPrompt: string
): Promise<ReadableStream> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_CHAT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  })
  if (!response.ok) throw new Error(`Claude API error ${response.status}`)

  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n').filter(Boolean)) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data) as {
                type?: string
                delta?: { text?: string }
              }
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`
                  )
                )
              }
            } catch {
              /* skip */
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}
