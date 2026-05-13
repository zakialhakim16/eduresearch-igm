<div align="center">

# EduResearch AI

**Platform Bimbingan Riset Akademik Berbasis AI untuk Mahasiswa UIGM**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-1.75-e64a19?style=flat-square&logo=rust)](https://rustlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![Ollama](https://img.shields.io/badge/Ollama-Qwen2.5-black?style=flat-square)](https://ollama.ai)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Demo](#) · [Dokumentasi](#dokumentasi) · [Kontribusi](#kontribusi) · [Roadmap](#roadmap)

</div>

---

## Tentang Project

EduResearch AI adalah platform ekosistem riset berbasis kecerdasan buatan yang dirancang khusus untuk mahasiswa **Universitas Indo Global Mandiri (UIGM) Palembang**. Platform ini hadir sebagai **mentor riset digital** yang membimbing mahasiswa dalam proses penulisan karya ilmiah — mulai dari proposal, skripsi/tugas akhir, hingga publikasi jurnal ilmiah.

> **Filosofi Utama:** *Membimbing, bukan menggantikan.* AI bertanya, mahasiswa berpikir dan berkembang.

Platform ini menggunakan pendekatan **Socratic Learning** — AI tidak menulis konten untuk mahasiswa, melainkan mengajukan pertanyaan yang mendorong mahasiswa menemukan dan mengembangkan ide mereka sendiri.

---

## Fitur Utama

### Modul Proposal Research
- Eksplorasi topik penelitian dengan panduan Socratic
- Identifikasi gap penelitian secara sistematis
- Panduan rumusan masalah, tujuan, dan metodologi
- Context-first onboarding: upload draft yang ada atau mulai dari nol

### Modul Skripsi & Tugas Akhir
- Bimbingan per-bab (BAB I hingga BAB V)
- Mapping teori dan referensi akademik
- Panduan interpretasi data
- Simulasi mock defense

### Modul Jurnal & Publikasi
- Targeting jurnal SINTA 1-6 (nasional)
- Panduan jurnal internasional (Scopus, IEEE, Springer)
- Abstract optimizer & format IMRaD
- Panduan respon reviewer

### Reference Engine
- Integrasi multi-platform: OpenAlex, Semantic Scholar, DOAJ, arXiv
- 250 juta+ karya ilmiah tersedia
- Filter: tahun, open access, bidang ilmu
- Simpan referensi ke library pribadi

### Research Journey Log
- Rekam jejak proses berpikir dari awal hingga selesai
- Visualisasi progress per modul
- Portofolio riset mahasiswa

---

## Tech Stack

### Frontend & Backend
| Teknologi | Versi | Fungsi |
|---|---|---|
| Next.js | 14 | Frontend + API Routes |
| TypeScript | 5.0 | Type-safe development |
| Tailwind CSS | 3.4 | Styling |
| Shadcn/UI | Latest | UI Components |
| Zustand | 4.x | State Management |
| Zod | 3.x | Schema Validation |

### AI & Machine Learning
| Teknologi | Fungsi |
|---|---|
| Ollama | LLM Runtime (lokal) |
| Qwen 2.5 14B | Model utama (Bahasa Indonesia) |
| Vercel AI SDK | Streaming response |
| pgvector | Vector similarity search |

### Rust Microservices
| Service | Teknologi | Fungsi |
|---|---|---|
| doc-parser | Actix-web + lopdf | Document intelligence |
| journal-scraper | Actix-web + reqwest | Metadata DOI (Crossref) |
| ai-cache | Tonic + candle | Vector search & caching |

### Infrastructure
| Teknologi | Fungsi |
|---|---|
| Supabase | PostgreSQL + Auth + Storage |
| Docker + Compose | Container orchestration |
| Redis (Upstash) | Response caching |
| Turborepo | Monorepo management |
| Vercel | Frontend deployment |
| Railway | Rust doc-parser (Docker) |

---

## Arsitektur

```
┌─────────────────────────────────────────────────────┐
│              NEXT.JS (TypeScript)                   │
│         Frontend + API Orchestrator                 │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP
       ┌───────────┼──────────────┐
       ▼           ▼              ▼
┌──────────┐ ┌──────────┐ ┌────────────┐
│  RUST    │ │  RUST    │ │   RUST     │
│ Service  │ │ Service  │ │  Service   │
│    1     │ │    2     │ │     3      │
│ Document │ │ Journal  │ │ AI Cache   │
│  Parser  │ │ Scraper  │ │ + Vector   │
└──────────┘ └──────────┘ └────────────┘
       │           │              │
       └───────────┼──────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│              SUPABASE                               │
│         PostgreSQL + pgvector + Auth                │
└─────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              OLLAMA                                 │
│           Qwen 2.5 14B (GPU)                        │
└─────────────────────────────────────────────────────┘
```

---

## Struktur Project

```
eduresearch-igm/
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── dashboard/
│   │   │   │   ├── proposal/
│   │   │   │   ├── skripsi/
│   │   │   │   ├── jurnal/
│   │   │   │   └── references/
│   │   │   └── api/
│   │   │       ├── chat/
│   │   │       └── references/
│   │   └── lib/
│   │       ├── supabase.ts
│   │       ├── supabase.server.ts
│   │       ├── ollama.ts
│   │       ├── openalex.ts
│   │       └── prompts.ts
│   │
│   └── mobile/                 # React Native app
│
├── services/
│   ├── doc-parser/             # Rust: Document Intelligence
│   ├── journal-scraper/        # Rust: Journal Scraper
│   └── ai-cache/               # Rust: Vector Cache
│
├── packages/
│   └── types/                  # Shared TypeScript types
│
├── docker-compose.yml
└── turbo.json
```

---

## Memulai

### Prasyarat

- Node.js 18+
- npm 10+
- Rust 1.75+ (untuk services)
- Docker + Docker Compose
- GPU NVIDIA (opsional, untuk Ollama)

### Instalasi

**1. Clone repository**
```bash
git clone https://github.com/username/eduresearch-igm.git
cd eduresearch-igm
```

**2. Install dependencies**
```bash
npm install
```

**3. Setup environment variables**
```bash
cp apps/web/.env.example apps/web/.env.local
```

Isi variabel berikut di `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
OLLAMA_URL=http://localhost:11434
```

**4. Setup Supabase**

Jalankan SQL berikut di Supabase SQL Editor:
```sql
-- Enable pgvector
create extension if not exists vector;

-- Jalankan semua migration di /supabase/migrations
```

**5. Install & jalankan Ollama**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download model
ollama pull qwen2.5:14b

# Jalankan
ollama serve
```

**6. Jalankan development server**
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### Dengan Docker

```bash
# Jalankan semua service
docker-compose up -d

# Lihat logs
docker-compose logs -f
```

---

## Penggunaan

### Register
1. Buka `/register`
2. Masukkan NPM (format: `2023110105`)
3. Email otomatis: `npm@student.uigm.ac.id`
4. Pilih jenjang, fakultas, dan prodi
5. Klik Daftar

### Mulai Bimbingan Proposal
1. Login dengan NPM & password
2. Pilih modul **Proposal** di dashboard
3. Upload draft yang ada, atau mulai dari nol
4. Ikuti panduan Socratic step-by-step
5. Progress tersimpan otomatis di Journey Log

### Cari Referensi
1. Buka menu **Cari Referensi**
2. Ketik topik penelitian
3. Filter berdasarkan tahun & open access
4. Simpan referensi ke library pribadi

---

## Deploy produksi (Railway + Vercel)

### 1. doc-parser (Rust) — **Railway** (disarankan)

Fly.io sering meminta **saldo / kartu** di awal; untuk doc-parser lebih mudah lewat **Railway** (trial/kredit sesuai kebijakan terbaru [Railway](https://railway.app/pricing)).

1. Daftar / login di [railway.app](https://railway.app).
2. **New project** → **Deploy from GitHub repo** → pilih `jaki16/eduresearch-igm`.
3. Buka service yang baru → **Settings**:
   - **Root Directory** / source path: **`services/doc-parser`** (wajib — `Dockerfile` ada di situ).
   - Biarkan build memakai **Dockerfile** (ada [`railway.json`](services/doc-parser/railway.json) yang memaksa builder `DOCKERFILE` + healthcheck `/health`).
4. **Settings → Networking** → **Generate domain** (HTTPS).
5. Salin URL publik (mis. `https://eduresearch-igm-production-xxxx.up.railway.app`) → set sebagai **`DOC_PARSER_URL`** di Vercel (tanpa slash di akhir).

**Port:** Railway meng-inject env **`PORT`**. Service sudah membaca `PORT` + `HOST` di [`main.rs`](services/doc-parser/src/main.rs); tidak perlu set manual kecuali debugging.

#### Setup dari terminal (CLI)

Dokumentasi resmi: [Railway CLI](https://docs.railway.com/guides/cli).

1. **Pasang CLI** (sekali per mesin):

   ```bash
   bash <(curl -fsSL https://railway.com/install.sh)
   source "$HOME/.railway/env"   # atau buka terminal baru (PATH ditambah di ~/.bashrc)
   railway --version
   ```

2. **Login** (buka browser):

   ```bash
   railway login
   ```

   Di SSH / tanpa browser: `railway login --browserless` (butuh TTY interaktif). Untuk CI, pakai env **`RAILWAY_TOKEN`** / **`RAILWAY_API_TOKEN`** — lihat [Tokens](https://docs.railway.com/integrations/api#project-token).

3. **Hubungkan folder `services/doc-parser` ke Railway:**

   ```bash
   cd services/doc-parser
   ```

   - **Proyek baru:** `railway init --name eduresearch-doc-parser` (membuat project + link folder ini).
   - **Proyek sudah ada (mis. dibuat dari dashboard):** `railway link` lalu pilih workspace + project + service doc-parser.

4. **Deploy dari mesin lokal** (upload konteks folder ini, build Dockerfile):

   ```bash
   railway up --detach
   ```

5. **Domain publik (HTTPS)** — generate lalu salin URL ke Vercel sebagai `DOC_PARSER_URL`:

   ```bash
   railway domain
   ```

6. **Cek status / log:**

   ```bash
   railway status
   railway logs
   ```

**Alternatif:** tetap deploy dari **GitHub** di dashboard Railway (root directory `services/doc-parser`); CLI hanya untuk `link`, `logs`, `domain`, dan redeploy tanpa push.

#### Fly.io (opsional)

Jika nanti pakai Fly lagi: [`services/doc-parser/fly.toml`](services/doc-parser/fly.toml) + `fly deploy` dari folder itu. Siapkan billing Fly sesuai kebijakan mereka.

### 1b. journal-scraper (Rust) — **opsional**

Service kedua untuk **metadata DOI** lewat [Crossref REST API](https://api.crossref.org/documentation/rest-api). Next.js saat ini belum memanggilnya; siap untuk integrasi berikutnya (mis. validasi DOI di library).

- Kode: [`services/journal-scraper`](services/journal-scraper) — endpoint `GET /health`, `GET /metadata?doi=...` (default lokal **port 8002**).
- **Crossref polite pool:** set env **`CROSSREF_MAILTO`** (email kontak) di produksi; User-Agent memakainya otomatis.
- **Railway:** sama seperti doc-parser — root directory **`services/journal-scraper`**, [`railway.json`](services/journal-scraper/railway.json), Dockerfile multi-stage.

```bash
cd services/journal-scraper
PORT=8002 cargo run
# curl "http://127.0.0.1:8002/metadata?doi=10.1037/0003-066x.59.8.847"
```

### 2. Next.js — Vercel

1. Import repo di [Vercel](https://vercel.com), set **Root Directory** ke `apps/web` (penting untuk npm workspaces).
2. **Environment variables** (Production + Preview):

| Variable | Keterangan |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `ANTHROPIC_API_KEY` | Fallback AI di serverless (tanpa Ollama) |
| `DOC_PARSER_URL` | URL HTTPS Railway doc-parser (bukan `localhost`) |
| `OLLAMA_URL` | Opsional; di Vercel biasanya dikosongkan |

3. Deploy; uji login, upload dokumen, analisis (memanggil doc-parser), chat.

### 3. Checklist singkat

- [ ] Migrasi `supabase/migrations/001_initial.sql` sudah dijalankan di Supabase
- [ ] Bucket Storage `documents` ada di Supabase
- [ ] `DOC_PARSER_URL` mengarah ke URL **HTTPS** service doc-parser (Railway)
- [ ] `ANTHROPIC_API_KEY` terisi di Vercel bila tidak pakai Ollama di server

---

## Roadmap

```
FASE 0 ✅  Monorepo + Docker + Database Schema
FASE 1 ✅  Auth UIGM + Onboarding + Dashboard
FASE 2 ✅  Socratic AI Engine (Ollama + Qwen)
FASE 3 ✅  Reference Engine (OpenAlex)
FASE 4 ✅  Rust Service 1: Document Parser
FASE 5 🔄  Rust Service 2: Journal Scraper (skeleton + Crossref metadata)
FASE 6 ⏳  Rust Service 3: Vector Cache
FASE 7 ⏳  React Native Mobile App
FASE 8 ⏳  Production Deployment
```

---

## Kontribusi

Project ini saat ini dalam tahap pengembangan aktif oleh solo developer. Kontribusi akan dibuka setelah MVP selesai.

Untuk saran, bug report, atau diskusi — buka [Issue](https://github.com/username/eduresearch-igm/issues).

---

## Lisensi

[MIT License](LICENSE) — bebas digunakan untuk kepentingan pendidikan.

---

## Developer

**Muhammad Zaki Al Hakim**
System Architect & Full-Stack Developer
Universitas Indo Global Mandiri — Teknik Informatika

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077b5?style=flat-square&logo=linkedin)](https://linkedin.com/in/username)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?style=flat-square&logo=github)](https://github.com/username)

---

<div align="center">

Dibuat dengan ❤️ untuk ekosistem riset UIGM Palembang

*"Bukan sekadar tools — ini ekosistem riset yang membangun kompetensi mahasiswa."*

</div>