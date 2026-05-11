import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

type StartSessionRequest = {
  document_id: string
}

function mapDocumentTypeToModule(jenis: string) {
  if (jenis === 'skripsi') return 'skripsi'
  if (jenis === 'jurnal') return 'jurnal'
  if (jenis === 'laporan_kp') return 'proposal'
  if (jenis === 'proposal') return 'proposal'

  return 'proposal'
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
      .select('id, user_id, nama_file, jenis, status, structure, ai_summary')
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

    const moduleName = mapDocumentTypeToModule(document.jenis)

    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id, modul')
      .eq('user_id', user.id)
      .eq('document_id', document.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSession) {
      return NextResponse.json({
        success: true,
        session_id: existingSession.id,
        modul: existingSession.modul,
        redirect_url: `/dashboard/${existingSession.modul}?session_id=${existingSession.id}`,
      })
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        document_id: document.id,
        modul: moduleName,
        status: 'active',
      })
      .select('id, modul')
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Gagal membuat sesi bimbingan: ' + sessionError?.message },
        { status: 500 }
      )
    }

    const initialMessage = `
Saya sudah membaca dokumen "${document.nama_file}".

Ringkasan awal dokumen:
${document.ai_summary ?? 'Belum ada ringkasan AI.'}

Sekarang kita akan mulai bimbingan berbasis dokumen ini.

Pertanyaan awal:
Menurut kamu, bagian mana dari dokumen ini yang paling perlu diperkuat terlebih dahulu: topik, rumusan masalah, metode, referensi, atau kontribusi penelitian?
`.trim()

    const { error: messageError } = await supabase.from('messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: initialMessage,
      model_used: 'system-context',
      tokens_used: 0,
    })

    if (messageError) {
      return NextResponse.json(
        { error: 'Sesi dibuat, tetapi gagal membuat pesan awal: ' + messageError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      modul: session.modul,
      redirect_url: `/dashboard/${session.modul}?session_id=${session.id}`,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat sesi dari dokumen' },
      { status: 500 }
    )
  }
}