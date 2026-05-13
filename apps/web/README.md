# EduResearch AI Web App

Aplikasi web utama untuk platform EduResearch AI. Folder ini berisi antarmuka pengguna, route API Next.js, integrasi Supabase, dan orkestrasi layanan pendukung seperti `doc-parser`, `journal-scraper`, `research-brain`, OpenAlex, Ollama, dan provider AI fallback.

## Gambaran Singkat

Web app ini menangani alur utama pengguna:

- autentikasi mahasiswa
- dashboard riset
- manajemen dokumen penelitian
- pencarian dan penyimpanan referensi
- sesi bimbingan berbasis AI
- integrasi metadata jurnal
- parsing dan analisis dokumen
- rekomendasi paper, scoring proposal, klasifikasi topik, indexing, dan analytics via Research Brain

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR dan Supabase Auth
- Vercel AI SDK
- Zustand
- Zod

## Struktur Folder Penting

```text
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── api/
│   │   ├── auth/logout/
│   │   ├── chat/
│   │   ├── documents/
│   │   ├── journals/metadata/
│   │   ├── references/
│   │   └── sessions/
│   └── dashboard/
│       ├── documents/
│       ├── proposal/
│       ├── references/
│       └── settings/
├── components/
├── lib/
├── public/
├── .env.example
└── package.json
```

## Menjalankan Secara Lokal

Dari root monorepo:

```bash
npm install
npm run dev --workspace=web
```

Atau dari folder ini:

```bash
npm install
npm run dev
```

Secara default aplikasi berjalan di:

```text
http://localhost:3001
```

## Environment Variables

Salin file environment:

```bash
cp .env.example .env.local
```

Variabel yang digunakan web app:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
DOC_PARSER_URL=http://localhost:8001
JOURNAL_SCRAPER_URL=http://localhost:8002
RESEARCH_BRAIN_URL=http://localhost:8010
```

Opsional untuk production/serverless:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Dependensi Eksternal

- Supabase untuk auth, database, dan storage
- `doc-parser` untuk analisis dokumen
- `journal-scraper` untuk metadata DOI
- `research-brain` untuk rekomendasi paper, scoring proposal, klasifikasi topik, indexing, dan analytics riset
- Ollama untuk model AI lokal
- Anthropic API sebagai fallback AI production
- OpenAlex untuk pencarian paper

## Route Penting

- `/login` dan `/register` untuk auth
- `/dashboard` untuk home workspace
- `/dashboard/documents` untuk upload dan analisis dokumen
- `/dashboard/proposal` untuk sesi bimbingan
- `/dashboard/references` untuk pencarian referensi
- `/api/chat` untuk streaming respons AI
- `/api/documents/*` untuk analisis dokumen dan referensi
- `/api/journals/metadata` untuk proxy metadata DOI
- `/api/sessions/*` untuk manajemen sesi

## Deployment

Untuk deploy ke Vercel:

1. Set Root Directory ke `apps/web`.
2. Isi seluruh environment variables production.
3. Pastikan migrasi Supabase sudah dijalankan.
4. Pastikan `DOC_PARSER_URL`, `JOURNAL_SCRAPER_URL`, dan `RESEARCH_BRAIN_URL` memakai URL HTTPS jika dipakai di production.

## Catatan

- Route `/` mengarahkan pengguna ke `/login`.
- Middleware melindungi area `/dashboard`.
- Script `dev` memakai port `3001`.
- Route `/api/documents/analyze` memerlukan `DOC_PARSER_URL`.
- Route `/api/journals/metadata` memerlukan `JOURNAL_SCRAPER_URL`.
- Route Brain seperti `/api/documents/score-proposal`, `/api/documents/classify-topic`, `/api/documents/index-brain`, dan `/api/analytics/research-map` memerlukan `RESEARCH_BRAIN_URL`.
- Route `/api/documents/recommend-references` memakai `RESEARCH_BRAIN_URL` jika tersedia dan fallback ke OpenAlex jika service belum aktif.
