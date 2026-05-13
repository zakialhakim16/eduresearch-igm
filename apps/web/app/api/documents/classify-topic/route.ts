import { NextResponse } from 'next/server'
import {
  callResearchBrain,
  isResearchBrainUnavailable,
  type TopicClassifyResponse,
} from '@/lib/research-brain'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type ClassifyTopicRequest = {
  document_id: string
}

type DocumentStructure = {
  keywords?: string[]
}

function extractMethods(keywords: string[] | null, structure?: DocumentStructure | null) {
  const haystack = [...(keywords ?? []), ...(structure?.keywords ?? [])]
  return haystack
    .filter((item) => /method|metode|model|algorithm|classification|regression|svm|cnn|lstm|bayes/i.test(item))
    .slice(0, 8)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClassifyTopicRequest

    if (!body.document_id) {
      return NextResponse.json(
        { error: 'document_id wajib dikirim' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, user_id, nama_file, ai_summary, extracted_text, research_keywords, research_query, structure')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    const structure = document.structure as DocumentStructure | null
    const classification = await callResearchBrain<TopicClassifyResponse>(
      '/classify/topic',
      {
        method: 'POST',
        body: JSON.stringify({
          title: document.research_query || document.nama_file,
          abstract: document.ai_summary ?? document.extracted_text?.slice(0, 1800) ?? null,
          keywords: document.research_keywords ?? structure?.keywords ?? [],
          methods: extractMethods(document.research_keywords, structure),
        }),
        timeoutMs: 12000,
      }
    )

    const { data: savedClassification, error: upsertError } = await supabase
      .from('research_brain_topic_classifications')
      .upsert(
        {
          user_id: user.id,
          document_id: document.id,
          primary_topic: classification.primary_topic,
          confidence: classification.confidence,
          matched_keywords: classification.matched_keywords,
          alternative_topics: classification.alternative_topics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,document_id' }
      )
      .select('*')
      .single()

    if (upsertError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan klasifikasi topik: ' + upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      classification: savedClassification,
    })
  } catch (error) {
    console.error(error)

    if (isResearchBrainUnavailable(error)) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat klasifikasi topik' },
      { status: 500 }
    )
  }
}
