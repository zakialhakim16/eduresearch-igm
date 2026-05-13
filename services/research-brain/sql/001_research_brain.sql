create extension if not exists vector;

create table if not exists research_brain_documents (
  id uuid primary key,
  document_id uuid not null,
  title text not null,
  content text not null,
  document_type text,
  keywords text[] default '{}',
  embedding vector(384),
  created_at timestamptz not null default now()
);

create table if not exists research_brain_proposal_scores (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  total_score integer not null,
  verdict text not null,
  rubric jsonb not null,
  recommendations jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function match_research_brain_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int
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
    research_brain_documents.id,
    research_brain_documents.document_id,
    research_brain_documents.title,
    research_brain_documents.content,
    1 - (research_brain_documents.embedding <=> query_embedding) as similarity
  from research_brain_documents
  where 1 - (research_brain_documents.embedding <=> query_embedding) > match_threshold
  order by research_brain_documents.embedding <=> query_embedding asc
  limit match_count;
$$;

create index if not exists research_brain_documents_embedding_hnsw
  on research_brain_documents
  using hnsw (embedding vector_cosine_ops);
