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
| journal-scraper | Tokio + reqwest | Journal scraping engine |
| ai-cache | Tonic + candle | Vector search & caching |

### Infrastructure
| Teknologi | Fungsi |
|---|---|
| Supabase | PostgreSQL + Auth + Storage |
| Docker + Compose | Container orchestration |
| Redis (Upstash) | Response caching |
| Turborepo | Monorepo management |
| Vercel | Frontend deployment |
| Fly.io | Rust services deployment |

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

## Deploy produksi (Fly.io + Vercel)

### 1. doc-parser (Rust) — Fly.io

**Prasyarat — install flyctl** (jika perintah `fly` tidak ditemukan):

```bash
curl -L https://fly.io/install.sh | sh
# Tambahkan ke PATH (bash), lalu buka terminal baru atau: source ~/.bashrc
export PATH="$HOME/.fly/bin:$PATH"
fly version
```

Dokumentasi resmi: [Install flyctl](https://fly.io/docs/hands-on/install-flyctl/).

```bash
cd services/doc-parser
fly auth login
fly launch --region sin --yes
# Perubahan berikutnya:
fly deploy
```

**Penjelasan error `region  not found` (ada spasi ganda):** di flyctl, itu artinya **`RegionCode` di launch plan kosong** — bukan karena kode `sin` salah. Biasanya terjadi setelah langkah **placement** (API kapasitas region) mengembalikan region kosong; sering berkorelasi dengan **organisasi belum punya metode pembayaran** (kamu juga melihat peringatan *no payment method*).

**Langkah yang disarankan (urutan):**

1. **Tambah metode pembayaran** di [Fly.io → Dashboard → Billing](https://fly.io/dashboard/personal/billing), lalu ulang:
   ```bash
   fly launch --region sin --yes
   ```
2. **Upgrade flyctl** ke versi terbaru (re-run installer `curl -L https://fly.io/install.sh | sh`).
3. **Lewati `fly launch`**, buat app lalu deploy (cocok jika `launch` tetap gagal):
   ```bash
   cd services/doc-parser
   fly apps create eduresearch-doc-parser --save -y
   fly deploy --primary-region sin --ha=false -y
   ```
   Ganti nama app di `fly.toml` dan di perintah di atas jika nama sudah dipakai orang lain.

**Jangan** mengetik dua perintah dalam satu baris tanpa `&&` — gunakan baris terpisah atau `fly launch ... && fly deploy` agar deploy tidak jalan kalau launch gagal.

`HOST` / `PORT` default **`0.0.0.0:8001`** (lihat `Dockerfile`). Catat URL publik Fly (mis. `https://eduresearch-doc-parser.fly.dev`) untuk `DOC_PARSER_URL` di Vercel.

Health check: `GET /health`.

#### Deploy otomatis lewat GitHub Actions

Setelah billing Fly aktif dan app sudah dibuat (`app` di `services/doc-parser/fly.toml` sama dengan nama app di Fly):

1. Lokal: `fly auth login` lalu `cd services/doc-parser` dan `fly tokens create deploy` — salin token (boleh berawalan `FlyV1`).
2. GitHub repo → **Settings → Secrets and variables → Actions** → buat secret **`FLY_API_TOKEN`**.
3. Push ke `main` yang mengubah `services/doc-parser/**`, atau buka tab **Actions** → workflow **Deploy doc-parser to Fly.io** → **Run workflow**.

Workflow: [`.github/workflows/deploy-doc-parser.yml`](.github/workflows/deploy-doc-parser.yml). Dokumentasi Fly: [Continuous deployment with GitHub Actions](https://fly.io/docs/launch/continuous-deployment-with-github-actions/).

### 2. Next.js — Vercel

1. Import repo di [Vercel](https://vercel.com), set **Root Directory** ke `apps/web` (penting untuk npm workspaces).
2. **Environment variables** (Production + Preview):

| Variable | Keterangan |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `ANTHROPIC_API_KEY` | Fallback AI di serverless (tanpa Ollama) |
| `DOC_PARSER_URL` | URL Fly.io doc-parser, contoh `https://eduresearch-doc-parser.fly.dev` |
| `OLLAMA_URL` | Opsional; di Vercel biasanya dikosongkan |

3. Deploy; uji login, upload dokumen, analisis (memanggil doc-parser), chat.

### 3. Checklist singkat

- [ ] Migrasi `supabase/migrations/001_initial.sql` sudah dijalankan di Supabase
- [ ] Bucket Storage `documents` ada di Supabase
- [ ] `DOC_PARSER_URL` mengarah ke Fly.io (HTTPS)
- [ ] `ANTHROPIC_API_KEY` terisi di Vercel bila tidak pakai Ollama di server

---

## Roadmap

```
FASE 0 ✅  Monorepo + Docker + Database Schema
FASE 1 ✅  Auth UIGM + Onboarding + Dashboard
FASE 2 ✅  Socratic AI Engine (Ollama + Qwen)
FASE 3 ✅  Reference Engine (OpenAlex)
FASE 4 🔄  Rust Service 1: Document Parser
FASE 5 ⏳  Rust Service 2: Journal Scraper
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