/**
 * Ubah pesan error teknis dari API menjadi teks yang lebih mudah dipahami di UI.
 */
export function formatAiClientError(message: string): string {
  const m = message.trim()

  if (
    m.includes('Tidak ada AI provider') ||
    (m.includes('OLLAMA_URL') && m.includes('ANTHROPIC_API_KEY'))
  ) {
    return 'Layanan AI belum siap. Untuk produksi pastikan ANTHROPIC_API_KEY terisi di server. Untuk lokal, jalankan Ollama dan set OLLAMA_URL di .env.local.'
  }

  if (m.includes('Ollama') || m.includes('ollama')) {
    return 'Tidak bisa menghubungi Ollama. Pastikan Ollama berjalan dan OLLAMA_URL benar (mis. http://localhost:11434).'
  }

  return m
}
