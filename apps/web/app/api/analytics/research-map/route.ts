import { NextResponse } from 'next/server'
import {
  callResearchBrain,
  isResearchBrainUnavailable,
  type ResearchMapResponse,
} from '@/lib/research-brain'
import { createServerSupabaseClient } from '@/lib/supabase.server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('id, nama_file, created_at, research_keywords, structure')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (documentsError) {
      return NextResponse.json(
        { error: 'Gagal mengambil dokumen' },
        { status: 500 }
      )
    }

    const documentIds = (documents ?? []).map((document) => document.id)

    const { data: classifications } = documentIds.length
      ? await supabase
          .from('research_brain_topic_classifications')
          .select('document_id, primary_topic')
          .eq('user_id', user.id)
          .in('document_id', documentIds)
      : { data: [] }

    const topicByDocument = new Map(
      (classifications ?? []).map((item) => [item.document_id, item.primary_topic])
    )

    const items = (documents ?? []).map((document) => {
      const structure = document.structure as { keywords?: string[] } | null
      return {
        title: document.nama_file,
        year: new Date(document.created_at).getFullYear(),
        topic: topicByDocument.get(document.id) ?? null,
        keywords: document.research_keywords ?? structure?.keywords ?? [],
        methods: [],
        authors: [],
      }
    })

    const hasResearchSignal = items.some(
      (item) => item.topic || item.keywords.length > 0 || item.methods.length > 0
    )

    if (!hasResearchSignal) {
      return NextResponse.json({
        success: true,
        map: {
          total_items: 0,
          top_topics: [],
          top_methods: [],
          top_keywords: [],
          year_distribution: [],
        },
      })
    }

    const map = await callResearchBrain<ResearchMapResponse>(
      '/analytics/research-map',
      {
        method: 'POST',
        body: JSON.stringify({ items }),
        timeoutMs: 12000,
      }
    )

    return NextResponse.json({
      success: true,
      map,
    })
  } catch (error) {
    console.error(error)

    if (isResearchBrainUnavailable(error)) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat peta riset' },
      { status: 500 }
    )
  }
}
