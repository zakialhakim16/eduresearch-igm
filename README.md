# EduResearch AI

Platform bimbingan riset akademik berbasis AI untuk mahasiswa Universitas Indo Global Mandiri (UIGM) Palembang.

EduResearch AI dirancang sebagai mentor riset digital: membantu mahasiswa mengeksplorasi topik, membaca dokumen, mencari referensi, dan berdiskusi secara Socratic tanpa menggantikan proses berpikir dan penulisan mahasiswa.

## Status

Proyek ini sedang aktif dikembangkan sebagai monorepo. Fokus implementasi saat ini berada pada aplikasi web, Supabase, dan dua service Rust pendukung:

- `apps/web`: aplikasi Next.js utama
- `services/doc-parser`: service analisis dokumen
- `services/journal-scraper`: service metadata DOI/Crossref
- `supabase/migrations`: skema database dan RPC Supabase

Beberapa folder eksperimental/roadmap dapat muncul secara lokal, tetapi README ini hanya mendokumentasikan bagian yang sudah menjadi alur utama proyek.

## Fitur Utama

- Auth mahasiswa berbasis Supabase Auth
- Dashboard riset untuk dokumen, proposal, referensi, dan pengaturan
- Upload dokumen akademik PDF/DOCX
- Analisis dokumen melalui service `doc-parser`
- Ringkasan, ekstraksi keyword, dan analisis gap referensi berbasis AI
- Chat bimbingan Socratic dengan riwayat sesi
- Reference engine berbasis OpenAlex
- Penyimpanan referensi ke library dokumen
- Proxy metadata jurnal melalui `journal-scraper`

## Filosofi Produk

EduResearch AI mengikuti prinsip:

> Membimbing, bukan menggantikan.

AI boleh membantu mahasiswa menilai argumen, menemukan celah, menyusun pertanyaan, dan memahami referensi. AI tidak dimaksudkan untuk menuliskan skripsi, proposal, atau artikel ilmiah sebagai pengganti kerja akademik mahasiswa.

## Tech Stack

### Web App

| Teknologi | Versi saat ini | Fungsi |
| --- | --- | --- |
| Next.js | 16.2.6 | App Router, Server Components, API Routes |
| React | 19.2.4 | UI |
| TypeScript | 5.x | Type-safe development |
| Tailwind CSS | 4.x | Styling |
| Supabase SSR | 0.10.x | Auth dan session cookies |
| Supabase JS | 2.105.x | Database, Auth, Storage |
| Vercel AI SDK | 6.x | Orkestrasi AI |
| Zustand | 5.x | State management |
| Zod | 4.x | Validasi data |

### AI dan Data

| Teknologi | Fungsi |
| --- | --- |
| Ollama | LLM lokal saat development |
| Anthropic API | Fallback AI untuk production/serverless |
| OpenAlex | Pencarian paper akademik |
| Supabase PostgreSQL | Database utama |
| Supabase Storage | Penyimpanan dokumen |
| pgvector | Ekstensi vector di Supabase |

### Services

| Service | Teknologi | Fungsi |
| --- | --- | --- |
| `doc-parser` | Rust | Parsing dan analisis dokumen |
| `journal-scraper` | Rust | Metadata DOI via Crossref |

## Struktur Repo

```text
eduresearch-igm/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (auth)/
│       │   ├── api/
│       │   └── dashboard/
│       ├── components/
│       ├── lib/
│       ├── public/
│       ├── .env.example
│       └── package.json
├── services/
│   ├── doc-parser/
│   └── journal-scraper/
├── supabase/
│   └── migrations/
├── QA_CHECKLIST.md
├── package.json
└── turbo.json
```

## Prasyarat

- Node.js 20+ direkomendasikan
- npm 11 sesuai `packageManager`
- Supabase project
- Rust toolchain untuk menjalankan service lokal
- Ollama untuk AI lokal, atau `ANTHROPIC_API_KEY` untuk fallback AI

## Setup Lokal

### 1. Clone repo

```bash
git clone https://github.com/zakialhakim16/eduresearch-igm.git
cd eduresearch-igm
```

### 2. Install dependency

```bash
npm install
```

### 3. Siapkan environment web

```bash
cp apps/web/.env.example apps/web/.env.local
```

Isi nilai Supabase dan service URL sesuai environment lokalmu. Jangan commit `.env.local`.

Variabel utama:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
DOC_PARSER_URL=http://localhost:8001
JOURNAL_SCRAPER_URL=http://localhost:8002
```

Untuk production tanpa Ollama lokal, set:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Jalankan migrasi Supabase

Jalankan file SQL di folder `supabase/migrations` pada Supabase SQL Editor atau melalui workflow migrasi Supabase:

```text
supabase/migrations/001_initial.sql
supabase/migrations/002_start_document_session_rpc.sql
```

Pastikan bucket Storage bernama `documents` sudah dibuat di Supabase.

### 5. Jalankan Ollama lokal

```bash
ollama pull qwen2.5:7b
ollama serve
```

### 6. Jalankan service Rust lokal

`doc-parser`:

```bash
cd services/doc-parser
PORT=8001 cargo run
```

`journal-scraper`:

```bash
cd services/journal-scraper
PORT=8002 cargo run
```

### 7. Jalankan web app

Dari root monorepo:

```bash
npm run dev --workspace=web
```

Atau dari folder `apps/web`:

```bash
cd apps/web
npm run dev
```

Web app berjalan di:

```text
http://localhost:3001
```

## Script

Root monorepo:

```bash
npm run dev
npm run build
npm run lint
```

Workspace web:

```bash
npm run dev --workspace=web
npm run build --workspace=web
npm run lint --workspace=web
```

## Alur Penggunaan

1. Buka `/register` untuk membuat akun mahasiswa.
2. Login melalui `/login`.
3. Gunakan dashboard untuk upload dokumen atau mulai bimbingan proposal.
4. Analisis dokumen melalui menu Dokumen Saya.
5. Ekstrak keyword dan cari referensi akademik.
6. Simpan referensi ke library dokumen.
7. Lanjutkan diskusi di sesi bimbingan berbasis dokumen.

## Deployment

### Web App di Vercel

1. Import repo ke Vercel.
2. Set Root Directory ke `apps/web`.
3. Isi environment variables production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
   - `DOC_PARSER_URL`
   - `JOURNAL_SCRAPER_URL`
4. Deploy.

### doc-parser di Railway

1. Deploy dari folder `services/doc-parser`.
2. Gunakan Dockerfile service tersebut.
3. Generate HTTPS domain.
4. Pakai domain Railway sebagai `DOC_PARSER_URL` di Vercel.

### journal-scraper di Railway

1. Deploy dari folder `services/journal-scraper`.
2. Generate HTTPS domain.
3. Pakai domain Railway sebagai `JOURNAL_SCRAPER_URL` di Vercel.
4. Set `CROSSREF_MAILTO` di environment service untuk polite pool Crossref.

## Roadmap

- Memperkuat parsing dan klasifikasi struktur dokumen
- Menambah analisis kualitas referensi
- Menambah export laporan bimbingan
- Menyiapkan mobile app setelah web MVP stabil
- Menambahkan shared package jika kontrak tipe lintas app mulai stabil

## Kontribusi

Project ini masih dikembangkan sebagai proyek utama pribadi. Issue dan saran tetap terbuka melalui GitHub:

```text
https://github.com/zakialhakim16/eduresearch-igm/issues
```

## Developer

Muhammad Zaki Al Hakim
Universitas Indo Global Mandiri, Teknik Informatika
