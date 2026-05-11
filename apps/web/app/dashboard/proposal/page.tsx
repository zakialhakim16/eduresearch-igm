'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_PROPOSAL_MESSAGE = `Halo! Saya EduResearch AI, mentor riset kamu. Mari kita mulai dengan mengeksplorasi topik penelitianmu.

Ceritakan dulu — bidang apa yang paling menarik perhatianmu belakangan ini?
Tidak perlu langsung spesifik, cukup ceritakan minat atau keresahanmu.`

const STEPS = [
  { id: 'eksplorasi_topik',    label: 'Eksplorasi Topik' },
  { id: 'identifikasi_masalah', label: 'Identifikasi Masalah' },
  { id: 'rumusan_masalah',     label: 'Rumusan Masalah' },
  { id: 'tujuan_penelitian',   label: 'Tujuan Penelitian' },
  { id: 'metodologi',          label: 'Metodologi' },
]

export default function ProposalPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const supabase = useMemo(() => createClient(), [])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [streaming, setStreaming] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true

    async function loadSessionMessages() {
      if (!sessionId) {
        setMessages([
          {
            role: 'assistant',
            content: DEFAULT_PROPOSAL_MESSAGE,
          },
        ])
        setLoadingSession(false)
        return
      }

      const { data, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (!isMounted) return

      if (error) {
        console.error('Gagal mengambil messages:', error.message)
        setMessages([
          {
            role: 'assistant',
            content: DEFAULT_PROPOSAL_MESSAGE,
          },
        ])
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
        setMessages([
          {
            role: 'assistant',
            content: DEFAULT_PROPOSAL_MESSAGE,
          },
        ])
      }

      setLoadingSession(false)
    }

    loadSessionMessages()

    return () => {
      isMounted = false
    }
  }, [sessionId, supabase])

  // Auto scroll ke bawah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Tambah pesan user ke UI
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)

    // Simpan pesan user ke DB
    if (sessionId) {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
      })
    }

    try {
      // Kirim ke API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          step: STEPS[currentStep].id,
          sessionId
        })
      })

      // Handle streaming response
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ''
      setStreaming('')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                aiResponse += parsed.content
                setStreaming(aiResponse)
              }
            } catch {}
          }
        }
      }

      // Tambah response final ke messages
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse
      }])
      setStreaming('')

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, terjadi error. Coba lagi ya!'
      }])
    }

    setLoading(false)
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Memuat sesi bimbingan...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
          ← Dashboard
        </a>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-semibold">Modul Proposal</h1>
      </nav>

      {/* Steps Progress */}
      <div className="border-b px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index < currentStep
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index < currentStep ? '✓' : index + 1}. {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' && (
                <p className="text-xs font-medium mb-1 opacity-60">EduResearch AI</p>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-muted text-foreground whitespace-pre-wrap">
              <p className="text-xs font-medium mb-1 opacity-60">EduResearch AI</p>
              {streaming}
              <span className="animate-pulse">▌</span>
            </div>
          </div>
        )}

        {/* Loading dots */}
        {loading && !streaming && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ketik pesanmu... (Enter untuk kirim, Shift+Enter untuk baris baru)"
            rows={1}
            className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            Kirim →
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          EduResearch AI membimbing, bukan menuliskan. Kamu yang berpikir, AI yang memandu.
        </p>
      </div>
    </div>
  )
}