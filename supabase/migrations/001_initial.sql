-- EduResearch IGM — schema awal
-- Jalankan di Supabase SQL Editor atau: supabase db push

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT,
  nama TEXT,
  jenjang TEXT,
  fakultas TEXT,
  prodi TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  nama_file TEXT NOT NULL,
  jenis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  storage_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  extracted_text TEXT,
  structure JSONB,
  ai_summary TEXT,
  research_keywords TEXT[],
  research_query TEXT,
  reference_gap_analysis TEXT,
  reference_gap_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_user_id_created_at_idx ON public.documents (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents (id) ON DELETE SET NULL,
  modul TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_created_at_idx ON public.sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_document_id_idx ON public.sessions (document_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_session_id_created_at_idx ON public.messages (session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.paper_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents (id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions (id) ON DELETE SET NULL,
  openalex_id TEXT NOT NULL,
  judul TEXT NOT NULL,
  penulis TEXT[],
  tahun INTEGER,
  jurnal TEXT,
  doi TEXT,
  url TEXT,
  abstrak TEXT,
  sitasi_count INTEGER,
  is_open_access BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT paper_references_user_document_openalex_unique UNIQUE NULLS NOT DISTINCT (user_id, document_id, openalex_id)
);

CREATE INDEX IF NOT EXISTS paper_references_document_id_idx ON public.paper_references (document_id);
CREATE INDEX IF NOT EXISTS paper_references_user_id_idx ON public.paper_references (user_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_references ENABLE ROW LEVEL SECURITY;

-- Idempotent: aman dijalankan ulang setelah partial run / policy sudah ada
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "documents_all_own" ON public.documents;
CREATE POLICY "documents_all_own" ON public.documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_all_own" ON public.sessions;
CREATE POLICY "sessions_all_own" ON public.sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_via_session" ON public.messages;
CREATE POLICY "messages_via_session" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = messages.session_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = messages.session_id AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "paper_references_all_own" ON public.paper_references;
CREATE POLICY "paper_references_all_own" ON public.paper_references FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage: buat bucket privat `documents` di Supabase Dashboard agar cocok dengan .storage.from('documents').
