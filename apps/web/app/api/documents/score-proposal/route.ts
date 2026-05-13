import { NextResponse } from 'next/server'
import {
  callResearchBrain,
  isResearchBrainUnavailable,
  type ProposalScoreResponse,
} from '@/lib/research-brain'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type ScoreProposalRequest = {
  document_id: string
}

type DocumentStructure = {
  detected_type?: string
  references?: string[]
  keywords?: string[]
  text_preview?: string
}

function extractMethods(keywords: string[] | null, structure?: DocumentStructure | null) {
  const haystack = [...(keywords ?? []), ...(structure?.keywords ?? [])]
  return haystack
    .filter((item) =>
      /method|metode|model|algorithm|classification|regression|svm|cnn|lstm|naive|bayes|k-fold|dataset/i.test(item)
    )
    .slice(0, 8)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScoreProposalRequest

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
      .select(
        'id, user_id, nama_file, jenis, ai_summary, extracted_text, research_keywords, research_query, structure'
      )
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    const { data: references } = await supabase
      .from('paper_references')
      .select('judul, tahun, doi')
      .eq('user_id', user.id)
      .eq('document_id', document.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const structure = document.structure as DocumentStructure | null
    const referenceTexts = [
      ...(structure?.references ?? []),
      ...((references ?? []).map((reference) =>
        [reference.judul, reference.tahun, reference.doi ? `DOI:${reference.doi}` : null]
          .filter(Boolean)
          .join(' ')
      )),
    ]

    const score = await callResearchBrain<ProposalScoreResponse>(
      '/score/proposal',
      {
        method: 'POST',
        body: JSON.stringify({
          title: document.research_query || document.nama_file,
          abstract:
            document.ai_summary ??
            document.extracted_text?.slice(0, 1800) ??
            structure?.text_preview ??
            null,
          problem_statement: document.ai_summary ?? document.extracted_text?.slice(0, 1200) ?? null,
          objectives: [],
          methods: extractMethods(document.research_keywords, structure),
          references: referenceTexts,
          keywords: document.research_keywords ?? structure?.keywords ?? [],
          expected_contribution: null,
        }),
        timeoutMs: 15000,
      }
    )

    const { data: savedScore, error: upsertError } = await supabase
      .from('research_brain_proposal_scores')
      .upsert(
        {
          user_id: user.id,
          document_id: document.id,
          total_score: score.total_score,
          max_score: score.max_score,
          verdict: score.verdict,
          rubric: score.rubric,
          strengths: score.strengths,
          weaknesses: score.weaknesses,
          recommendations: score.recommendations,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,document_id' }
      )
      .select('*')
      .single()

    if (upsertError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan skor proposal: ' + upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      score: savedScore,
    })
  } catch (error) {
    console.error(error)

    if (isResearchBrainUnavailable(error)) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat score proposal' },
      { status: 500 }
    )
  }
}
