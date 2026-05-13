import { NextResponse } from 'next/server'
import {
  callResearchBrain,
  isResearchBrainUnavailable,
  type BrainJobResponse,
} from '@/lib/research-brain'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type IndexBrainRequest = {
  document_id: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IndexBrainRequest

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
      .select('id, user_id, nama_file, jenis, extracted_text, ai_summary, research_keywords')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    const content = document.extracted_text ?? document.ai_summary ?? ''

    if (content.length < 10) {
      return NextResponse.json(
        { error: 'Dokumen belum memiliki teks yang cukup untuk indexing' },
        { status: 400 }
      )
    }

    const job = await callResearchBrain<BrainJobResponse>(
      '/jobs/index-document',
      {
        method: 'POST',
        body: JSON.stringify({
          document_id: document.id,
          title: document.nama_file,
          content,
          document_type: document.jenis,
          keywords: document.research_keywords ?? [],
        }),
        timeoutMs: 12000,
      }
    )

    const { data: savedJob, error: upsertError } = await supabase
      .from('research_brain_index_jobs')
      .upsert(
        {
          user_id: user.id,
          document_id: document.id,
          job_id: job.job_id,
          status: job.status,
          message: job.message,
          progress: job.progress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,document_id' }
      )
      .select('*')
      .single()

    if (upsertError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan job indexing: ' + upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      job: savedJob,
    })
  } catch (error) {
    console.error(error)

    if (isResearchBrainUnavailable(error)) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat job indexing' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      return NextResponse.json(
        { error: 'job_id wajib dikirim' },
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

    const { data: existingJob, error: existingJobError } = await supabase
      .from('research_brain_index_jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (existingJobError || !existingJob) {
      return NextResponse.json(
        { error: 'Job tidak ditemukan' },
        { status: 404 }
      )
    }

    const job = await callResearchBrain<BrainJobResponse>(`/jobs/${jobId}`, {
      timeoutMs: 10000,
    })

    const { data: savedJob, error: updateError } = await supabase
      .from('research_brain_index_jobs')
      .update({
        status: job.status,
        message: job.message,
        progress: job.progress,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal memperbarui status job: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job: savedJob,
    })
  } catch (error) {
    console.error(error)

    if (isResearchBrainUnavailable(error)) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil status job' },
      { status: 500 }
    )
  }
}
