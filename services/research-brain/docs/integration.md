# Integrasi dengan EduResearch AI

Panduan ini menghubungkan `research-brain` dengan struktur repo EduResearch AI yang sekarang.

## Posisi Folder yang Disarankan

```text
services/
├── doc-parser/
├── journal-scraper/
└── research-brain/
```

## Environment Variable Tambahan di `apps/web/.env.local`

```env
RESEARCH_BRAIN_URL=http://localhost:8010
```

## Route Next.js yang Paling Cocok Disambungkan

Berdasarkan pola route yang sudah ada:

- `app/api/documents/recommend-references/route.ts`
- `app/api/documents/analyze/route.ts`
- `app/api/chat/route.ts`
- `app/api/references/route.ts`

tambahkan alur baru seperti ini:

### 1. Ganti rekomendasi referensi agar lewat `research-brain`

`POST /api/documents/recommend-references`

- ambil `document_id`
- load `research_query`, `research_keywords`, `structure`, dan `extracted_text`
- panggil `POST ${RESEARCH_BRAIN_URL}/recommend/papers`

Body yang disarankan:

```json
{
  "title": "Judul proposal atau nama dokumen",
  "abstract": "Ringkasan atau cuplikan dokumen",
  "keywords": ["svm", "chi-square", "phishing"],
  "methods": ["support vector machine", "stratified k-fold"],
  "document_type": "proposal"
}
```

### 2. Tambahkan endpoint scoring proposal

Contoh route baru:

`app/api/documents/score-proposal/route.ts`

Langkah:

- validasi auth user
- ambil dokumen dari Supabase
- bangun payload scoring
- kirim ke `POST ${RESEARCH_BRAIN_URL}/score/proposal`
- simpan hasil ke kolom `structure` atau tabel baru

### 3. Tambahkan analytics kampus

Contoh route baru:

`app/api/analytics/research-map/route.ts`

Langkah:

- load daftar dokumen / sesi / referensi
- kirim ke `POST ${RESEARCH_BRAIN_URL}/analytics/research-map`
- tampilkan hasil di dashboard admin atau dosen

## Alur Arsitektur yang Disarankan

```text
apps/web -> auth, dashboard, orkestrasi
doc-parser -> ekstraksi dokumen
journal-scraper -> metadata DOI
research-brain -> scoring, recommendation, classification, analytics
Supabase -> source of truth dokumen, sesi, pesan, referensi
```

## Tahap Implementasi

1. Sambungkan `recommend-references` ke `research-brain`
2. Tambahkan `score-proposal`
3. Tambahkan `classify-topic`
4. Tambahkan indexing job untuk dokumen yang sudah dianalisis parser
