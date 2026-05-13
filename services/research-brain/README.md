# Research Brain Service

`research-brain` adalah service Python untuk menjadikan EduResearch AI sebagai "otak riset" kampus.

Service ini dirancang untuk:

- semantic search dan hybrid search referensi
- rekomendasi paper dari judul, abstrak, kata kunci, dan metode
- scoring kualitas proposal penelitian
- klasifikasi topik riset kampus
- analytics sederhana untuk peta riset
- background job untuk indexing dokumen

## Kenapa Service Terpisah

Repo EduResearch AI yang Anda kembangkan sudah bergerak ke pola modular:

- `apps/web` untuk UI, auth, dashboard, dan route orchestration
- `services/doc-parser` untuk ekstraksi dokumen
- `services/journal-scraper` untuk metadata DOI

Karena itu, `research-brain` dibuat sebagai service Python baru yang fokus pada reasoning, ranking, scoring, dan analytics.

## Fitur Utama

- `POST /search/semantic`
- `POST /search/hybrid`
- `POST /recommend/papers`
- `POST /score/proposal`
- `POST /classify/topic`
- `POST /analytics/research-map`
- `POST /jobs/index-document`
- `GET /jobs/{job_id}`
- `GET /health`

## Struktur Folder

```text
research-brain/
├── app/
│   ├── core/
│   ├── routers/
│   ├── schemas/
│   ├── services/
│   ├── workers/
│   └── main.py
├── docs/
├── sql/
├── tests/
├── .env.example
├── Dockerfile
├── pyproject.toml
└── README.md
```

## Menjalankan Lokal

```bash
cd services/research-brain
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8010
```

Docs otomatis tersedia di:

- `http://127.0.0.1:8010/docs`
- `http://127.0.0.1:8010/redoc`

## Environment Variables

Lihat file `.env.example`.

Yang paling penting:

- `RESEARCH_BRAIN_PORT`
- `OPENALEX_BASE_URL`
- `CROSSREF_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `EMBEDDING_MODEL`

## Mode Implementasi

Service ini sengaja dibuat bertahap:

1. MVP yang sudah berfungsi dengan heuristik dan integrasi OpenAlex
2. Siap dinaikkan ke vector retrieval penuh dengan pgvector
3. Siap ditambah worker Celery untuk indexing berat

## File Penting

- `app/main.py` untuk entrypoint FastAPI
- `app/routers/` untuk endpoint
- `app/services/openalex_service.py` untuk scholarly retrieval
- `app/services/retrieval_service.py` untuk ranking
- `app/services/proposal_scoring_service.py` untuk scoring proposal
- `app/services/topic_classifier_service.py` untuk klasifikasi topik
- `sql/001_research_brain.sql` untuk tabel vector dan hasil analisis
- `docs/integration.md` untuk panduan menyambungkan ke repo utama
