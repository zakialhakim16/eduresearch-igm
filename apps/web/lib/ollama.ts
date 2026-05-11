const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function chatWithOllama(
  messages: OllamaMessage[],
  model: string = 'qwen2.5:7b'
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.message.content
}

export async function streamWithOllama(
  messages: OllamaMessage[],
  model: string = 'qwen2.5:7b'
): Promise<ReadableStream> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`)
  }

  return response.body!
}