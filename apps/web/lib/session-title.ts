/** Judul singkat untuk sidebar / daftar sesi dari pesan user pertama. */
export function makeSessionTitle(firstMessage?: string | null) {
  if (!firstMessage) return 'Bimbingan Baru'

  const clean = firstMessage.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Bimbingan Baru'
  if (clean.length <= 60) return clean
  return `${clean.slice(0, 60).trim()}…`
}
