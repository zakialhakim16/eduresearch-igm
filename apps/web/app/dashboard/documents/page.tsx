'use client'

import { CheckCircle2, Circle, FolderOpen } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'
import { formatAiClientError } from '@/lib/format-ai-client-error'
import { isSupabasePublicEnvConfigured } from '@/lib/supabase-public-env'
import { useSupabaseBrowserClient } from '@/lib/use-supabase-browser'

type RecommendedReference = {
  openalex_id: string
  title: string
  year: number | null
  doi: string | null
  authors: string[]
  journal: string | null
  cited_by_count: number
  url: string | null
  abstract: string
  is_open_access: boolean
}

type SavedReference = {
  id: string
  document_id: string
  openalex_id: string | null
  judul: string
  penulis: string[] | null
  tahun: number | null
  jurnal: string | null
  doi: string | null
  url: string | null
  abstrak: string | null
  sitasi_count: number | null
  is_open_access: boolean | null
  created_at: string
}

type ChapterInfo = {
  title: string
  word_count?: number
  start_line?: number
}

type QualityScore = {
  total?: number
  has_abstract?: boolean
  has_chapters?: boolean
  has_references?: boolean
  has_methodology?: boolean
  word_count_adequate?: boolean
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

type DocumentItem = {
  id: string
  nama_file: string
  jenis: string
  status: string
  storage_path: string | null
  file_size: number | null
  mime_type: string | null
  structure: DocumentStructure | null
  ai_summary: string | null
  research_keywords: string[] | null
  research_query: string | null
  reference_gap_analysis: string | null
  reference_gap_updated_at: string | null
  created_at: string
}

type DocumentDetailTab = 'summary' | 'structure' | 'references' | 'gap'

const DOCUMENT_TYPES = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'skripsi', label: 'Skripsi / Tugas Akhir' },
  { value: 'laporan_kp', label: 'Laporan KP / PKL' },
  { value: 'jurnal', label: 'Jurnal / Artikel Ilmiah' },
  { value: 'template', label: 'Template Dokumen' },
  { value: 'lainnya', label: 'Lainnya' },
]

export default function DocumentsPage() {
  const router = useRouter()
  const supabase = useSupabaseBrowserClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>()
  const [jenis, setJenis] = useState('proposal')
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null)
  const [activeDocumentTabs, setActiveDocumentTabs] = useState<
    Record<string, DocumentDetailTab>
  >({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [summarizingId, setSummarizingId] = useState<string | null>(null)
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null)
  const [extractingKeywordsId, setExtractingKeywordsId] = useState<string | null>(null)
  const [findingReferencesId, setFindingReferencesId] = useState<string | null>(null)
  const [recommendedReferences, setRecommendedReferences] = useState<
    Record<string, RecommendedReference[]>
  >({})
  const [savedReferences, setSavedReferences] = useState<
    Record<string, SavedReference[]>
  >({})
  const [analyzingReferenceGapId, setAnalyzingReferenceGapId] = useState<
    string | null
  >(null)
  const [savingReferenceId, setSavingReferenceId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchSavedReferences = useCallback(
    async (documentIds: string[]) => {
      if (documentIds.length === 0) {
        setSavedReferences({})
        return
      }

      if (!supabase) return

      const { data, error } = await supabase
        .from('paper_references')
        .select('*')
        .in('document_id', documentIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Gagal mengambil referensi tersimpan:', error.message)
        return
      }

      const grouped: Record<string, SavedReference[]> = {}

      for (const reference of data ?? []) {
        if (!grouped[reference.document_id]) {
          grouped[reference.document_id] = []
        }

        grouped[reference.document_id].push(reference)
      }

      setSavedReferences(grouped)
    },
    [supabase]
  )

  const fetchDocuments = useCallback(
    async (currentUserId: string) => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('documents')
        .select(
          'id, nama_file, jenis, status, storage_path, file_size, mime_type, structure, ai_summary, research_keywords, research_query, reference_gap_analysis, reference_gap_updated_at, created_at'
        )
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (error) {
        setError('Gagal mengambil dokumen: ' + error.message)
        return
      }

      setDocuments(data ?? [])

      const documentIds = (data ?? []).map((doc) => doc.id)
      await fetchSavedReferences(documentIds)
    },
    [supabase, fetchSavedReferences]
  )

  useEffect(() => {
    if (!supabase) {
      if (!isSupabasePublicEnvConfigured()) {
        queueMicrotask(() => {
          setLoading(false)
          setError(
            'Supabase tidak dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di deployment lalu build ulang.'
          )
        })
      }
      return
    }

    const client = supabase

    let isMounted = true

    async function loadInitialData() {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser()

      if (!isMounted) return

      if (userError || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data, error } = await client
        .from('documents')
        .select(
          'id, nama_file, jenis, status, storage_path, file_size, mime_type, structure, ai_summary, research_keywords, research_query, reference_gap_analysis, reference_gap_updated_at, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        setError('Gagal mengambil dokumen: ' + error.message)
      } else {
        setDocuments(data ?? [])

        const documentIds = (data ?? []).map((doc) => doc.id)
        await fetchSavedReferences(documentIds)
      }

      setLoading(false)
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [router, supabase, fetchSavedReferences])

  function handleFileChange(file: File | null) {
    setError('')
    setSuccess('')

    if (!file) {
      setSelectedFile(null)
      return
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('File harus berformat PDF atau DOCX')
      setSelectedFile(null)
      return
    }

    const maxSize = 10 * 1024 * 1024

    if (file.size > maxSize) {
      setError('Ukuran file maksimal 10MB')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  function sanitizeFileName(fileName: string) {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]/g, '-')
      .replace(/-+/g, '-')
  }

  async function handleUpload() {
    if (!userId) {
      setError('User tidak ditemukan')
      return
    }

    if (!supabase) {
      setError('Koneksi ke database belum siap. Muat ulang halaman.')
      return
    }

    if (!selectedFile) {
      setError('Pilih file terlebih dahulu')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    const safeFileName = sanitizeFileName(selectedFile.name)
    const filePath = `${userId}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      setError('Gagal upload file: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('documents').insert({
      user_id: userId,
      nama_file: selectedFile.name,
      jenis,
      status: 'processing',
      storage_path: filePath,
      file_size: selectedFile.size,
      mime_type: selectedFile.type,
    })

    if (insertError) {
      const { error: cleanupError } = await supabase.storage
        .from('documents')
        .remove([filePath])

      if (cleanupError) {
        console.error(
          'Gagal membersihkan file setelah insert metadata gagal:',
          cleanupError.message
        )
        setError(
          'File terupload, tetapi metadata gagal disimpan dan cleanup storage gagal: ' +
            insertError.message
        )
      } else {
        setError(
          'Metadata gagal disimpan, sehingga file yang sempat terupload sudah dibersihkan: ' +
            insertError.message
        )
      }

      setUploading(false)
      return
    }

    setSelectedFile(null)
    setSuccess('Dokumen berhasil diupload. Status: processing.')

    await fetchDocuments(userId)

    setUploading(false)
  }

  async function handleAnalyze(documentId: string) {
    if (!userId) {
      setError('User tidak ditemukan')
      return
    }

    setAnalyzingId(documentId)
    setError('')
    setSuccess('')

    const response = await fetch('/api/documents/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(
        formatAiClientError(result.error ?? 'Gagal menganalisis dokumen')
      )
      setAnalyzingId(null)
      return
    }

    setSuccess('Dokumen berhasil dianalisis oleh Rust parser.')

    await fetchDocuments(userId)

    setAnalyzingId(null)
  }

  async function handleSummarize(documentId: string) {
    if (!userId) {
      setError('User tidak ditemukan')
      return
    }

    setSummarizingId(documentId)
    setError('')
    setSuccess('')

    const response = await fetch('/api/documents/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(
        formatAiClientError(result.error ?? 'Gagal membuat ringkasan AI')
      )
      setSummarizingId(null)
      return
    }

    setSuccess('Ringkasan AI sudah dibuat.')

    await fetchDocuments(userId)

    setSummarizingId(null)
  }

  async function handleStartGuidance(documentId: string) {
    setStartingSessionId(documentId)
    setError('')
    setSuccess('')

    const response = await fetch('/api/sessions/from-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(
        formatAiClientError(result.error ?? 'Gagal memulai sesi bimbingan')
      )
      setStartingSessionId(null)
      return
    }

    router.push(result.redirect_url)
  }

  async function handleExtractKeywords(documentId: string) {
    if (!userId) {
      setError('User tidak ditemukan')
      return
    }

    setExtractingKeywordsId(documentId)
    setError('')
    setSuccess('')

    const response = await fetch('/api/documents/extract-keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(
        formatAiClientError(result.error ?? 'Gagal mengekstrak keyword riset')
      )
      setExtractingKeywordsId(null)
      return
    }

    setSuccess('Keyword riset sudah siap.')

    await fetchDocuments(userId)

    setExtractingKeywordsId(null)
  }

  async function handleFindReferences(documentId: string) {
    setFindingReferencesId(documentId)
    setError('')
    setSuccess('')

    const response = await fetch('/api/documents/recommend-references', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(formatAiClientError(result.error ?? 'Gagal mencari referensi'))
      setFindingReferencesId(null)
      return
    }

    const references = result.references ?? []

    setRecommendedReferences((prev) => ({
      ...prev,
      [documentId]: references,
    }))

    if (references.length === 0) {
      setError(

        `OpenAlex belum menemukan referensi yang cocok. Query yang dicoba: ${
          result.tried_queries?.join(', ') ?? '-'
        }`
      )
    } else {
      setSuccess('Rekomendasi paper berhasil ditemukan.')
    }

    setFindingReferencesId(null)
  }

  async function handleSaveReference(
    documentId: string,
    reference: RecommendedReference
  ) {
    const saveKey = `${documentId}-${reference.openalex_id}`

    setSavingReferenceId(saveKey)
    setError('')
    setSuccess('')

    const response = await fetch('/api/references/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        reference,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(formatAiClientError(result.error ?? 'Gagal menyimpan referensi'))
      setSavingReferenceId(null)
      return
    }

    setSuccess('Referensi sudah disimpan ke library.')

    await fetchSavedReferences([documentId])

    setSavingReferenceId(null)
  }

  async function handleAnalyzeReferenceGap(documentId: string) {
    setAnalyzingReferenceGapId(documentId)
    setError('')
    setSuccess('')

    const response = await fetch('/api/documents/reference-gap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(
        formatAiClientError(result.error ?? 'Gagal menganalisis gap referensi')
      )
      setAnalyzingReferenceGapId(null)
      return
    }

    setSuccess('Analisis kekuatan referensi sudah dibuat.')

    if (userId) {
      await fetchDocuments(userId)
    }

    setAnalyzingReferenceGapId(null)
  }

  function formatFileSize(size: number | null) {
    if (!size) return '-'

    const kb = size / 1024
    const mb = kb / 1024

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`
    }

    return `${kb.toFixed(2)} KB`
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  function toggleDocumentDetail(documentId: string) {
    setExpandedDocumentId((current) => {
      const nextValue = current === documentId ? null : documentId

      if (nextValue) {
        setActiveDocumentTabs((prev) => ({
          ...prev,
          [documentId]: prev[documentId] ?? 'summary',
        }))
      }

      return nextValue
    })
  }

  function getActiveDocumentTab(documentId: string): DocumentDetailTab {
    return activeDocumentTabs[documentId] ?? 'summary'
  }

  function setActiveDocumentTab(documentId: string, tab: DocumentDetailTab) {
    setActiveDocumentTabs((prev) => ({
      ...prev,
      [documentId]: tab,
    }))
  }

  function getChapterTitle(chapter: string | ChapterInfo) {
    return typeof chapter === 'string' ? chapter : chapter.title
  }

  function getChapterMeta(chapter: string | ChapterInfo) {
    if (typeof chapter === 'string') return null

    const parts: string[] = []

    if (chapter.word_count !== undefined) {
      parts.push(`${chapter.word_count} kata`)
    }

    if (chapter.start_line !== undefined) {
      parts.push(`baris ${chapter.start_line}`)
    }

    return parts.length > 0 ? parts.join(' · ') : null
  }

  if (loading) {
    return (
      <div className="min-h-full min-w-0 bg-background px-4 py-10 md:px-6">
        <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-muted md:h-9" />
          <div className="h-4 max-w-xl rounded bg-muted" />
          <div className="rounded-2xl border bg-muted/30 p-6 space-y-4">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-10 rounded-lg bg-muted" />
              <div className="h-10 rounded-lg bg-muted" />
            </div>
            <div className="h-10 w-32 rounded-lg bg-muted" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="h-28 rounded-2xl border bg-muted/40" />
            <div className="h-28 rounded-2xl border bg-muted/40" />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Memuat dokumen...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-full min-w-0 bg-background">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">EduResearch AI</h1>
          <p className="text-xs text-muted-foreground">Dokumen Saya</p>
        </div>

        <a
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Kembali ke Dashboard
        </a>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10 space-y-8">
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">Document Intelligence</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dokumen Saya
          </h2>
          <p className="max-w-2xl text-sm md:text-base text-muted-foreground">
            Upload dokumen akademik kamu, lalu biarkan EduResearch AI membantu membaca,
            menganalisis, mencari referensi, dan memulai bimbingan.
          </p>
        </section>

        <section className="rounded-2xl border bg-background p-4 md:p-6 space-y-5">
          <div>
            <h3 className="font-semibold">Upload Dokumen Baru</h3>
            <p className="text-sm text-muted-foreground">
              Untuk tahap ini, dokumen akan disimpan dulu. Parser akan kita
              aktifkan pada step berikutnya.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Dokumen</label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">File</label>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) =>
                  handleFileChange(e.target.files?.[0] ?? null)
                }
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium">{selectedFile?.name}</p>
              <p className="text-muted-foreground">
                {formatFileSize(selectedFile?.size ?? 0)} · {selectedFile?.type ?? ''}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 md:w-auto"
          >
            {uploading ? (
              <>
                <Spinner aria-label="Mengupload" />
                Mengupload...
              </>
            ) : (
              'Upload Dokumen'
            )}
          </button>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="font-semibold">Daftar Dokumen</h3>
            <p className="text-sm text-muted-foreground">
              Dokumen yang sudah kamu upload akan muncul di sini.
            </p>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-2xl border bg-muted/30 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
              </div>
              <p className="font-medium">Belum ada dokumen</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload proposal, jurnal, atau skripsi pertama kamu untuk mulai dianalisis.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border bg-background p-4 md:p-5 space-y-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{doc.nama_file}</p>

                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {doc.jenis}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
                      </p>

                      {doc.structure && (
                        <p className="text-xs text-muted-foreground">
                          {doc.structure?.detected_type ?? '-'} ·{' '}
                          {doc.structure?.word_count ?? 0} kata
                          {doc.structure?.quality?.total !== undefined
                            ? ` · Skor ${doc.structure?.quality.total}/100` 
                            : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`w-fit text-xs px-2 py-1 rounded-full ${
                            doc.status === 'parsed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {doc.status === 'parsed' ? 'Sudah dianalisis' : 'Menunggu analisis'}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {doc.status === 'parsed'
                            ? 'Dokumen siap dipakai untuk bimbingan.'
                            : 'Klik Baca Dokumen untuk mulai.'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleStartGuidance(doc.id)}
                        disabled={
                          startingSessionId === doc.id ||
                          doc.status !== 'parsed' ||
                          !doc.ai_summary
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto"
                      >
                        {startingSessionId === doc.id ? (
                          <>
                            <Spinner aria-label="Memulai" />
                            Memulai...
                          </>
                        ) : (
                          'Mulai Bimbingan'
                        )}
                      </button>

                      <button
                        onClick={() => toggleDocumentDetail(doc.id)}
                        className="w-full sm:w-auto text-sm px-3 py-2 border rounded-lg hover:bg-muted"
                      >
                        {expandedDocumentId === doc.id ? 'Sembunyikan Detail' : 'Lihat Detail'}
                      </button>
                    </div>
                  </div>

                  {expandedDocumentId === doc.id && (
                    <div className="space-y-4">
                      <div className="rounded-xl border bg-muted/20 p-2">
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                          {[
                            { key: 'summary', label: 'Ringkasan' },
                            { key: 'structure', label: 'Struktur' },
                            { key: 'references', label: 'Referensi' },
                            { key: 'gap', label: 'Gap Analysis' },
                          ].map((tab) => {
                            const isActive = getActiveDocumentTab(doc.id) === tab.key

                            return (
                              <button
                                key={tab.key}
                                onClick={() =>
                                  setActiveDocumentTab(doc.id, tab.key as DocumentDetailTab)
                                }
                                className={`rounded-lg px-2 py-2 text-xs md:px-3 md:text-sm transition ${
                                  isActive
                                    ? 'bg-background font-medium shadow-sm'
                                    : 'text-muted-foreground hover:bg-background/60'
                                }`}
                              >
                                {tab.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-4">
                        {[
                          {
                            label: 'Dokumen dibaca',
                            done: doc.status === 'parsed',
                          },
                          {
                            label: 'Ringkasan AI',
                            done: Boolean(doc.ai_summary),
                          },
                          {
                            label: 'Keyword riset',
                            done: Boolean(doc.research_keywords?.length),
                          },
                          {
                            label: 'Referensi tersimpan',
                            done: Boolean(savedReferences[doc.id]?.length),
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl border bg-background p-3 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {item.done ? (
                                <CheckCircle2
                                  className="h-4 w-4 shrink-0 text-primary"
                                  aria-hidden
                                />
                              ) : (
                                <Circle
                                  className="h-4 w-4 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                              )}
                              <span
                                className={
                                  item.done ? 'font-medium' : 'text-muted-foreground'
                                }
                              >
                                {item.label}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {getActiveDocumentTab(doc.id) === 'summary' && (
                        <div className="space-y-4">
                          {analyzingId === doc.id && (
                            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                              <Spinner
                                className="text-primary"
                                aria-label="Memproses"
                              />
                              <span>Memproses dokumen lewat parser…</span>
                            </div>
                          )}

                          {summarizingId === doc.id && (
                            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                              <Spinner
                                className="text-primary"
                                aria-label="Meringkas"
                              />
                              <span>Membuat ringkasan AI…</span>
                            </div>
                          )}

                          <div className="space-y-3 rounded-xl border bg-background p-4">
                            <p className="text-sm font-medium">Aksi Dokumen</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleAnalyze(doc.id)}
                                disabled={analyzingId === doc.id}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                              >
                                {analyzingId === doc.id ? (
                                  <>
                                    <Spinner aria-label="Membaca dokumen" />
                                    Membaca...
                                  </>
                                ) : (
                                  'Baca Dokumen'
                                )}
                              </button>
                              <button
                                onClick={() => handleSummarize(doc.id)}
                                disabled={
                                  summarizingId === doc.id || doc.status !== 'parsed'
                                }
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                              >
                                {summarizingId === doc.id ? (
                                  <>
                                    <Spinner aria-label="Meringkas" />
                                    Meringkas...
                                  </>
                                ) : (
                                  'Buat Ringkasan'
                                )}
                              </button>
                            </div>
                          </div>

                          {doc.structure?.text_preview && (
                            <div className="rounded-xl border bg-background p-4 space-y-2">
                              <p className="text-sm font-medium">Preview Teks</p>
                              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-5">
                                {doc.structure.text_preview}
                              </p>
                            </div>
                          )}

                          {doc.ai_summary && (
                            <div className="rounded-xl border bg-background p-4 space-y-2">
                              <p className="text-sm font-medium">Ringkasan AI</p>
                              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                {doc.ai_summary}
                              </div>
                            </div>
                          )}

                          {doc.research_keywords && doc.research_keywords.length > 0 && (
                            <div className="rounded-xl border bg-background p-4 space-y-3">
                              <div>
                                <p className="text-sm font-medium">Keyword Riset</p>
                                <p className="text-xs text-muted-foreground">
                                  Keyword yang diekstrak untuk pencarian referensi.
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {doc.research_keywords.map((keyword) => (
                                  <span
                                    key={keyword}
                                    className="text-xs px-2 py-1 rounded-full border bg-muted/40"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>

                              {doc.research_query && (
                                <div>
                                  <p className="text-xs font-medium">Query Referensi</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {doc.research_query}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {getActiveDocumentTab(doc.id) === 'structure' && doc.structure && (
                        <div className="space-y-4">
                          <div className="rounded-xl border bg-background p-4 space-y-4">
                            <div className="grid gap-3 md:grid-cols-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Tipe Terdeteksi</p>
                                <p className="font-medium">
                                  {doc.structure.detected_type ?? '-'}
                                </p>
                              </div>

                              <div>
                                <p className="text-muted-foreground">Jumlah Kata</p>
                                <p className="font-medium">{doc.structure.word_count ?? 0}</p>
                              </div>

                              <div>
                                <p className="text-muted-foreground">Struktur Ditemukan</p>
                                <p className="font-medium">
                                  {doc.structure.chapters?.length ?? 0} bagian
                                </p>
                              </div>
                            </div>

                            {doc.structure.chapters && doc.structure.chapters.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Bagian terdeteksi:</p>
                                <div className="flex flex-wrap gap-2">
                                  {doc.structure.chapters.map((chapter, index) => {
                                    const title = getChapterTitle(chapter)
                                    const meta = getChapterMeta(chapter)

                                    return (
                                      <div
                                        key={`${title}-${index}`}
                                        className="text-xs px-3 py-2 rounded-lg border bg-muted/30"
                                      >
                                        <p className="font-medium">{title}</p>
                                        {meta && (
                                          <p className="text-muted-foreground mt-1">{meta}</p>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {doc.structure.quality && (
                            <div className="rounded-xl border bg-background p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Skor Kualitas Dokumen</p>
                                <span className="text-sm font-semibold">
                                  {doc.structure.quality.total ?? 0}/100
                                </span>
                              </div>

                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{
                                    width: `${Math.min(doc.structure.quality.total ?? 0, 100)}%`,
                                  }}
                                />
                              </div>

                              {doc.structure.quality.notes &&
                                doc.structure.quality.notes.length > 0 && (
                                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                    {doc.structure.quality.notes.map((note) => (
                                      <li key={note}>{note}</li>
                                    ))}
                                  </ul>
                                )}
                            </div>
                          )}

                          {doc.structure.keywords && doc.structure.keywords.length > 0 && (
                            <div className="rounded-xl border bg-background p-4 space-y-2">
                              <p className="text-sm font-medium">Keyword dari Parser</p>
                              <div className="flex flex-wrap gap-2">
                                {doc.structure.keywords.map((keyword) => (
                                  <span
                                    key={keyword}
                                    className="text-xs px-2 py-1 rounded-full border bg-muted/40"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {doc.structure.references && doc.structure.references.length > 0 && (
                            <div className="rounded-xl border bg-background p-4 space-y-3">
                              <p className="text-sm font-medium">
                                Referensi Terdeteksi dari Dokumen
                              </p>

                              <div className="space-y-2">
                                {doc.structure.references.slice(0, 5).map((reference, index) => (
                                  <div
                                    key={`${reference}-${index}`}
                                    className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground"
                                  >
                                    {reference}
                                  </div>
                                ))}
                              </div>

                              {doc.structure.references.length > 5 && (
                                <p className="text-xs text-muted-foreground">
                                  +{doc.structure.references.length - 5} referensi lainnya
                                  terdeteksi.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {getActiveDocumentTab(doc.id) === 'references' && (
                        <div className="space-y-4">
                          <div className="rounded-xl border bg-background p-4 space-y-3">
                            <p className="text-sm font-medium">Aksi Referensi</p>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleExtractKeywords(doc.id)}
                                disabled={
                                  extractingKeywordsId === doc.id ||
                                  doc.status !== 'parsed' ||
                                  !doc.ai_summary
                                }
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                              >
                                {extractingKeywordsId === doc.id ? (
                                  <>
                                    <Spinner aria-label="Mengambil keyword" />
                                    Mengambil...
                                  </>
                                ) : (
                                  'Ambil Keyword'
                                )}
                              </button>

                              <button
                                onClick={() => handleFindReferences(doc.id)}
                                disabled={findingReferencesId === doc.id || !doc.research_query}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                              >
                                {findingReferencesId === doc.id ? (
                                  <>
                                    <Spinner aria-label="Mencari paper" />
                                    Mencari...
                                  </>
                                ) : (
                                  'Cari Paper'
                                )}
                              </button>

                              <button
                                onClick={() => handleAnalyzeReferenceGap(doc.id)}
                                disabled={
                                  analyzingReferenceGapId === doc.id ||
                                  doc.status !== 'parsed'
                                }
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                              >
                                {analyzingReferenceGapId === doc.id ? (
                                  <>
                                    <Spinner aria-label="Menganalisis gap" />
                                    Mengecek...
                                  </>
                                ) : (
                                  'Cek Kekuatan Referensi'
                                )}
                              </button>
                            </div>
                          </div>

                          {recommendedReferences[doc.id] && (
                            <div className="space-y-3 border-t pt-4">
                              <div>
                                <p className="text-sm font-medium">Rekomendasi Referensi:</p>
                                <p className="text-xs text-muted-foreground">
                                  Berdasarkan keyword dan query dari dokumen ini.
                                </p>
                              </div>

                              {recommendedReferences[doc.id].length === 0 ? (
                                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                                  Belum ada referensi yang cocok dari OpenAlex untuk query ini.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {recommendedReferences[doc.id].map((ref) => (
                                    <div
                                      key={ref.openalex_id}
                                      className="rounded-lg border bg-background p-4 space-y-2"
                                    >
                                      <div className="space-y-1">
                                        <p className="font-medium text-sm leading-relaxed">
                                          {ref.title}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                          {ref.authors.length > 0
                                            ? ref.authors.join(', ')
                                            : 'Author tidak tersedia'}
                                          {ref.year ? ` · ${ref.year}` : ''}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                          {ref.journal ?? 'Jurnal tidak tersedia'} · Sitasi:{' '}
                                          {ref.cited_by_count}
                                        </p>
                                      </div>

                                      {ref.abstract && (
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                          {ref.abstract}
                                        </p>
                                      )}

                                      <div className="flex flex-wrap items-center gap-3 pt-2">
                                        {ref.url && (
                                          <a
                                            href={ref.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-primary hover:underline"
                                          >
                                            Buka referensi →
                                          </a>
                                        )}

                                        <button
                                          onClick={() => handleSaveReference(doc.id, ref)}
                                          disabled={
                                            savingReferenceId === `${doc.id}-${ref.openalex_id}`
                                          }
                                          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                                        >
                                          {savingReferenceId === `${doc.id}-${ref.openalex_id}` ? (
                                            <>
                                              <Spinner aria-label="Menyimpan" />
                                              Menyimpan...
                                            </>
                                          ) : (
                                            'Simpan Referensi'
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {savedReferences[doc.id] && savedReferences[doc.id].length > 0 && (
                            <div className="space-y-3 border-t pt-4">
                              <div>
                                <p className="text-sm font-medium">Referensi Tersimpan:</p>
                                <p className="text-xs text-muted-foreground">
                                  Referensi yang sudah kamu simpan untuk dokumen ini.
                                </p>
                              </div>

                              <div className="space-y-3">
                                {savedReferences[doc.id].map((ref) => (
                                  <div
                                    key={ref.id}
                                    className="rounded-lg border bg-background p-4 space-y-2"
                                  >
                                    <div className="space-y-1">
                                      <p className="font-medium text-sm leading-relaxed">
                                        {ref.judul}
                                      </p>

                                      <p className="text-xs text-muted-foreground">
                                        {ref.penulis && ref.penulis.length > 0
                                          ? ref.penulis.join(', ')
                                          : 'Author tidak tersedia'}
                                        {ref.tahun ? ` · ${ref.tahun}` : ''}
                                      </p>

                                      <p className="text-xs text-muted-foreground">
                                        {ref.jurnal ?? 'Jurnal tidak tersedia'} · Sitasi:{' '}
                                        {ref.sitasi_count ?? 0}
                                      </p>
                                    </div>

                                    {ref.abstrak && (
                                      <p className="text-sm text-muted-foreground line-clamp-3">
                                        {ref.abstrak}
                                      </p>
                                    )}

                                    {ref.url && (
                                      <a
                                        href={ref.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-block text-sm text-primary hover:underline"
                                      >
                                        Buka referensi →
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {getActiveDocumentTab(doc.id) === 'gap' && (
                        <div className="space-y-4">
                          <div className="space-y-3 rounded-xl border bg-background p-4">
                            <div>
                              <p className="text-sm font-medium">Kekuatan referensi</p>
                              <p className="text-xs text-muted-foreground">
                                Evaluasi AI terhadap kecukupan referensi yang kamu simpan.
                              </p>
                            </div>

                            {analyzingReferenceGapId === doc.id && (
                              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                                <Spinner className="text-primary" aria-label="Menganalisis" />
                                <span>Menganalisis gap referensi…</span>
                              </div>
                            )}

                            {doc.reference_gap_analysis ? (
                              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                {doc.reference_gap_analysis}
                              </div>
                            ) : (
                              analyzingReferenceGapId !== doc.id && (
                                <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                                  Belum ada analisis kekuatan referensi. Buka tab Referensi lalu
                                  klik Cek Kekuatan Referensi.
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
