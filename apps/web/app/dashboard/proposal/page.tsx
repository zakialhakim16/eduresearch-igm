'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_PROPOSAL_MESSAGE = `Halo! Saya EduResearch AI, mentor riset kamu.

Mari kita mulai dengan mengeksplorasi topik penelitianmu.

Ceritakan dulu — bidang apa yang paling menarik perhatianmu belakangan ini? Tidak perlu langsung spesifik, cukup ceritakan minat, keresahan, atau masalah yang sering kamu lihat.`

function getDefaultMessages(): ChatMessage[] {
  return [
    {
      role: 'assistant',
      content: DEFAULT_PROPOSAL_MESSAGE,
    },
  ]
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-3 [&_a]:text-primary [&_a]:underline">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold leading-relaxed">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold leading-relaxed">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold leading-relaxed">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          code: ({ className, children, ...props }) => {
            const inline = 'inline' in props && props.inline === true
            if (inline || !className) {
              return (
                <code className="rounded bg-background/80 px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              )
            }
            return (
              <code className={`${className} block overflow-x-auto text-xs font-mono`}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border bg-background/50 p-3 text-xs">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function ProposalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session_id')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    sessionIdFromUrl
  )
  const supabase = useMemo(() => createClient(), [])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>(getDefaultMessages)

  const [input, setInput] = useState('')
  const [loadingSession, setLoadingSession] = useState(Boolean(sessionIdFromUrl))
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadSessionMessages() {
      setError('')
      setActiveSessionId(sessionIdFromUrl)

      if (!sessionIdFromUrl) {
        setMessages(getDefaultMessages())
        setInput('')
        setLoadingSession(false)
        return
      }

      setLoadingSession(true)

      const { data, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', sessionIdFromUrl)
        .order('created_at', { ascending: true })

      if (!isMounted) return

      if (error) {
        console.error('Gagal mengambil messages:', error.message)
        setError('Gagal memuat sesi bimbingan.')
        setMessages(getDefaultMessages())
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
      } else {
        setMessages(getDefaultMessages())
      }

      setLoadingSession(false)
    }

    loadSessionMessages()

    return () => {
      isMounted = false
    }
  }, [sessionIdFromUrl, supabase])

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
      let sessionIdForRequest = activeSessionId

      if (!sessionIdForRequest) {
        const sessionResponse = await fetch('/api/sessions/new', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_message: trimmedInput,
          }),
        })

        const sessionResult = await sessionResponse.json()

        if (!sessionResponse.ok) {
          throw new Error(sessionResult.error ?? 'Gagal membuat sesi baru')
        }

        sessionIdForRequest = sessionResult.session_id as string
        setActiveSessionId(sessionIdForRequest)

        window.history.replaceState(
          null,
          '',
          `/dashboard/proposal?session_id=${sessionIdForRequest}`
        )
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages,
          step: 'proposal_guidance',
          sessionId: sessionIdForRequest,
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
      setError(
        error instanceof Error
          ? error.message
          : 'Gagal mendapatkan respons AI. Coba lagi.'
      )

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
      router.refresh()
    }
  }

  if (loadingSession) {
    return (
      <div className="ai-chat-surface flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-16">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          aria-hidden
        />
        <p className="text-sm font-medium text-muted-foreground">
          Memuat sesi bimbingan...
        </p>
      </div>
    )
  }

  return (
    <div className="ai-chat-surface flex min-h-0 flex-1 flex-col overflow-hidden bg-background/90">
      <header className="shrink-0 z-30 border-b border-border/50 bg-background/80 px-4 py-3.5 shadow-sm shadow-black/[0.02] backdrop-blur-xl md:px-6 dark:shadow-black/20">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary/90">
              Workspace
            </p>
            <h1 className="truncate font-semibold tracking-tight">
              Bimbingan Proposal
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeSessionId
                ? 'Percakapan tersimpan · lanjutkan kapan saja'
                : 'Eksplorasi topik baru · tanpa dokumen'}
            </p>
          </div>

          <div className="shrink-0 rounded-full bg-gradient-to-r from-primary/20 via-primary/12 to-accent/20 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-primary shadow-sm ring-1 ring-primary/25 dark:from-primary/25 dark:ring-primary/35">
            Socratic · AI
          </div>
        </div>
      </header>

      <main className="chat-scroll-left min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        <div className="mx-auto max-w-3xl px-3 py-5 md:px-6 md:py-8 space-y-6 md:space-y-8">
          {messages.map((message, index) => {
            const isUser = message.role === 'user'

            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[94%] gap-3 md:max-w-[88%] ${
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {!isUser && (
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/85 text-[10px] font-bold text-primary-foreground shadow-md shadow-primary/25"
                      aria-hidden
                    >
                      AI
                    </div>
                  )}
                  <div
                    className={`min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'whitespace-pre-wrap bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                        : 'border border-border/80 bg-card/90 text-foreground shadow-sm backdrop-blur-sm dark:bg-card/70'
                    }`}
                  >
                    {!isUser && (
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        EduResearch AI
                      </p>
                    )}

                    {message.content ? (
                      isUser ? (
                        <span>{message.content}</span>
                      ) : (
                        <AssistantMarkdown content={message.content} />
                      )
                    ) : (
                      <div className="space-y-2 pt-0.5">
                        <div className="typing-shimmer h-2.5 w-3/4 rounded-full" />
                        <div className="typing-shimmer h-2.5 w-1/2 rounded-full opacity-70" />
                        <p className="text-xs text-muted-foreground">
                          Menyusun jawaban...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {error && (
            <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="shrink-0 border-t border-border/60 bg-background/90 px-3 py-3 backdrop-blur-xl md:px-6 md:py-4 pb-24 md:pb-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-[1.35rem] border border-border/60 bg-muted/35 p-1.5 shadow-inner shadow-black/[0.04] transition-[border-color,box-shadow] focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20 dark:border-white/10 dark:bg-muted/25 dark:shadow-black/30 dark:focus-within:ring-primary/30"
          >
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
              className="min-h-[52px] max-h-40 w-full resize-none rounded-xl border-0 bg-transparent px-4 py-3 pr-[5.5rem] text-sm outline-none ring-0 placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/35 md:pr-28"
            />

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute bottom-2 right-2 rounded-xl bg-gradient-to-br from-primary to-primary/90 px-3 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-opacity hover:opacity-95 disabled:opacity-40 md:px-5"
            >
              {isStreaming ? (
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />
                  ...
                </span>
              ) : (
                'Kirim'
              )}
            </button>
          </form>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground md:text-xs">
            EduResearch AI membimbing dengan pertanyaan dan evaluasi — kamu yang
            berpikir, AI yang memandu.
          </p>
        </div>
      </footer>
    </div>
  )
}