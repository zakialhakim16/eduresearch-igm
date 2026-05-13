import { NextRequest, NextResponse } from 'next/server'
import { makeSessionTitle } from '@/lib/session-title'
import { createServerSupabaseClient } from '@/lib/supabase.server'

const DEFAULT_PROPOSAL_MESSAGE = `Halo! Saya EduResearch AI, mentor riset kamu.

Mari kita mulai dengan mengeksplorasi topik penelitianmu.

Ceritakan dulu — bidang apa yang paling menarik perhatianmu belakangan ini? Tidak perlu langsung spesifik, cukup ceritakan minat, keresahan, atau masalah yang sering kamu lihat.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let firstMessage = ''

    try {
      const body = await request.json()
      firstMessage = body?.first_message ?? ''
    } catch {
      firstMessage = ''
    }

    const title = makeSessionTitle(firstMessage)

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        modul: 'proposal',
        status: 'active',
        document_id: null,
        title,
      })
      .select('id, modul, title')
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Gagal membuat sesi baru: ' + sessionError?.message },
        { status: 500 }
      )
    }

    const { error: messageError } = await supabase.from('messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: DEFAULT_PROPOSAL_MESSAGE,
      model_used: 'system-context',
      tokens_used: 0,
    })

    if (messageError) {
      return NextResponse.json(
        {
          error:
            'Sesi dibuat, tetapi pesan awal gagal disimpan: ' +
            messageError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      title: session.title,
      redirect_url: `/dashboard/proposal?session_id=${session.id}`,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat sesi baru' },
      { status: 500 }
    )
  }
}
