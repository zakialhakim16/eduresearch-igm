'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_PROPOSAL_MESSAGE = `Halo! Saya EduResearch AI, mentor riset kamu.

Mari kita mulai dengan mengeksplorasi topik penelitianmu.

Ceritakan dulu — bidang apa yang paling menarik perhatianmu belakangan ini? Tidak perlu langsung spesifik, cukup ceritakan minat, keresahan, atau masalah yang sering kamu lihat.`

export default function ProposalPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const supabase = useMemo(() => createClient(), [])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: DEFAULT_PROPOSAL_MESSAGE,
    },
  ])

  const [input, setInput] = useState('')
  const [loadingSession, setLoadingSession] = useState(Boolean(sessionId))
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) return

    let isMounted = true

    async function loadSessionMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (!isMounted) return

      if (error) {
        console.error('Gagal mengambil messages:', error.message)
        setError('Gagal memuat sesi bimbingan.')
        setLoadingSession(false)
        return
      }

      if (data && data.length > 0) {
        setMessages(
          data.map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          }))
        )
      }

      setLoadingSession(false)
    }

    loadSessionMessages()

    return () => {
      isMounted = false
    }
  }, [sessionId, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const trimmedInput = input.trim()

    if (!trimmedInput || isStreaming) return

    setError('')
    setInput('')

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmedInput,
    }

    const nextMessages = [...messages, userMessage]

    setMessages([
      ...nextMessages,
      {
        role: 'assistant',
        content: '',
      },
    ])

    setIsStreaming(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages,
          step: 'proposal_guidance',
          sessionId,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Gagal menghubungi AI')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.replace('data: ', '')

          if (data === '[DONE]') {
            break
          }

          try {
            const parsed = JSON.parse(data)

            if (parsed.content) {
              setMessages((prev) => {
                const updated = [...prev]
                const lastIndex = updated.length - 1
                const lastMessage = updated[lastIndex]

                if (lastMessage?.role === 'assistant') {
                  updated[lastIndex] = {
                    ...lastMessage,
                    content: lastMessage.content + parsed.content,
                  }
                }

                return updated
              })
            }
          } catch {
            // Abaikan chunk yang bukan JSON valid
          }
        }
      }
    } catch (error) {
      console.error(error)
      setError('Gagal mendapatkan respons AI. Coba lagi.')

      setMessages((prev) => {
        const updated = [...prev]
        const lastIndex = updated.length - 1

        if (updated[lastIndex]?.role === 'assistant' && !updated[lastIndex].content) {
          updated.pop()
        }

        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Memuat sesi bimbingan...
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="font-semibold">Bimbingan Proposal</h1>
            <p className="text-xs text-muted-foreground">
              {sessionId
                ? 'Sesi berbasis dokumen aktif'
                : 'Sesi eksplorasi topik baru'}
            </p>
          </div>

          <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Socratic Mode
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-3xl py-8 space-y-6">
          {messages.map((message, index) => {
            const isUser = message.role === 'user'

            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {!isUser && (
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      EduResearch AI
                    </p>
                  )}

                  {message.content || (
                    <span className="text-muted-foreground">
                      Menyusun jawaban...
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t bg-background px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis jawaban atau pertanyaan risetmu..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              className="min-h-[52px] w-full resize-none rounded-2xl border bg-background px-4 py-3 pr-24 text-sm outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute bottom-2 right-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isStreaming ? '...' : 'Kirim'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            EduResearch AI membimbing dengan pertanyaan dan evaluasi, bukan
            menggantikan proses berpikirmu.
          </p>
        </div>
      </footer>
    </div>
  )
}