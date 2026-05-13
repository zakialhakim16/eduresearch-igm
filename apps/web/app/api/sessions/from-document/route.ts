import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type StartSessionRequest = {
  document_id: string
}

type StartedDocumentSession = {
  session_id: string
  session_modul: string
  created_new: boolean
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartSessionRequest

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
      .select('id, user_id, status')
      .eq('id', body.document_id)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    if (document.status !== 'parsed') {
      return NextResponse.json(
        { error: 'Dokumen harus dianalisis terlebih dahulu sebelum memulai bimbingan' },
        { status: 400 }
      )
    }

    const { data: startedSession, error: startError } = await supabase
      .rpc('start_document_session', {
        p_document_id: document.id,
      })
      .single()

    const session = startedSession as StartedDocumentSession | null

    if (startError || !session) {
      return NextResponse.json(
        { error: 'Gagal membuat sesi bimbingan: ' + startError?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session_id: session.session_id,
      modul: session.session_modul,
      redirect_url: `/dashboard/${session.session_modul}?session_id=${session.session_id}`,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat sesi dari dokumen' },
      { status: 500 }
    )
  }
}
