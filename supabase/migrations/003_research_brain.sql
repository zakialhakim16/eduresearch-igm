create extension if not exists vector;

create table if not exists public.research_brain_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  title text not null,
  content text not null,
  document_type text,
  keywords text[] not null default '{}',
  embedding vector(384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_brain_documents_user_document_unique unique (user_id, document_id)
);

create table if not exists public.research_brain_proposal_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  total_score integer not null,
  max_score integer not null,
  verdict text not null,
  rubric jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_brain_proposal_scores_user_document_unique unique (user_id, document_id)
);

create table if not exists public.research_brain_topic_classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  primary_topic text not null,
  confidence double precision not null,
  matched_keywords text[] not null default '{}',
  alternative_topics text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_brain_topic_classifications_user_document_unique unique (user_id, document_id)
);

create table if not exists public.research_brain_index_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  job_id text not null,
  status text not null,
  message text not null,
  progress integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_brain_index_jobs_job_unique unique (job_id),
  constraint research_brain_index_jobs_user_document_unique unique (user_id, document_id)
);

create index if not exists research_brain_documents_user_id_idx on public.research_brain_documents (user_id);
create index if not exists research_brain_documents_document_id_idx on public.research_brain_documents (document_id);
create index if not exists research_brain_proposal_scores_document_id_idx on public.research_brain_proposal_scores (document_id);
create index if not exists research_brain_topic_classifications_document_id_idx on public.research_brain_topic_classifications (document_id);
create index if not exists research_brain_index_jobs_document_id_idx on public.research_brain_index_jobs (document_id);

create index if not exists research_brain_documents_embedding_hnsw
  on public.research_brain_documents
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_research_brain_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid default auth.uid()
)
returns table (
  id uuid,
  document_id uuid,
  title text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    d.id,
    d.document_id,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.research_brain_documents d
  where d.user_id = p_user_id
    and d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding asc
  limit match_count;
$$;

alter table public.research_brain_documents enable row level security;
alter table public.research_brain_proposal_scores enable row level security;
alter table public.research_brain_topic_classifications enable row level security;
alter table public.research_brain_index_jobs enable row level security;

drop policy if exists "research_brain_documents_all_own" on public.research_brain_documents;
create policy "research_brain_documents_all_own" on public.research_brain_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "research_brain_proposal_scores_all_own" on public.research_brain_proposal_scores;
create policy "research_brain_proposal_scores_all_own" on public.research_brain_proposal_scores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "research_brain_topic_classifications_all_own" on public.research_brain_topic_classifications;
create policy "research_brain_topic_classifications_all_own" on public.research_brain_topic_classifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "research_brain_index_jobs_all_own" on public.research_brain_index_jobs;
create policy "research_brain_index_jobs_all_own" on public.research_brain_index_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
