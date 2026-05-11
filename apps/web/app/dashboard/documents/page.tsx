'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type DocumentStructure = {
  detected_type?: string
  word_count?: number
  chapters?: string[]
  text_preview?: string
  message?: string
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
  created_at: string
}

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
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jenis, setJenis] = useState('proposal')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchDocuments = useCallback(
    async (currentUserId: string) => {
      const { data, error } = await supabase
        .from('documents')
        .select(
          'id, nama_file, jenis, status, storage_path, file_size, mime_type, structure, created_at'
        )
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (error) {
        setError('Gagal mengambil dokumen: ' + error.message)
        return
      }

      setDocuments(data ?? [])
    },
    [supabase]
  )

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!isMounted) return

      if (userError || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from('documents')
        .select(
          'id, nama_file, jenis, status, storage_path, file_size, mime_type, structure, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        setError('Gagal mengambil dokumen: ' + error.message)
      } else {
        setDocuments(data ?? [])
      }

      setLoading(false)
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [router, supabase])

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
      setError(
        'File terupload, tetapi metadata gagal disimpan: ' +
          insertError.message
      )
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
      setError(result.error ?? 'Gagal menganalisis dokumen')
      setAnalyzingId(null)
      return
    }

    setSuccess('Dokumen berhasil dianalisis oleh Rust parser.')

    await fetchDocuments(userId)

    setAnalyzingId(null)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Memuat dokumen...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">Dokumen Saya</h2>
          <p className="text-muted-foreground">
            Upload proposal, skripsi, laporan KP, atau template akademik kamu.
          </p>
        </section>

        <section className="border rounded-xl p-6 space-y-5">
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
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-muted-foreground">
                {formatFileSize(selectedFile.size)} · {selectedFile.type}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? 'Mengupload...' : 'Upload Dokumen'}
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
            <div className="border rounded-xl p-8 text-center text-sm text-muted-foreground">
              Belum ada dokumen. Upload dokumen pertama kamu di atas.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-xl p-5 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.nama_file}</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {doc.jenis}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)} ·{' '}
                        {formatDate(doc.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          doc.status === 'parsed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {doc.status}
                      </span>

                      <button
                        onClick={() => handleAnalyze(doc.id)}
                        disabled={analyzingId === doc.id}
                        className="text-sm px-3 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
                      >
                        {analyzingId === doc.id ? 'Menganalisis...' : 'Analisis sekarang'}
                      </button>
                    </div>
                  </div>

                  {doc.structure && (
                    <div className="rounded-lg bg-muted/40 border p-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tipe Terdeteksi</p>
                          <p className="font-medium">
                            {doc.structure.detected_type ?? '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Jumlah Kata</p>
                          <p className="font-medium">
                            {doc.structure.word_count ?? 0}
                          </p>
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
                            {doc.structure.chapters.map((chapter) => (
                              <span
                                key={chapter}
                                className="text-xs px-2 py-1 rounded-full border bg-background"
                              >
                                {chapter}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {doc.structure.text_preview && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Preview Teks:</p>
                          <p className="text-sm leading-relaxed line-clamp-4">
                            {doc.structure.text_preview}
                          </p>
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