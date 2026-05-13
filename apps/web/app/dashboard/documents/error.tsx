'use client'

import { useEffect } from 'react'

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-4 py-16">
      <p className="text-center text-sm font-medium text-foreground">
        Terjadi kesalahan saat menampilkan halaman dokumen.
      </p>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        {error.message}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Coba lagi
      </button>
    </div>
  )
}
