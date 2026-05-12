import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase.server'

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

    const contentType = request.headers.get('content-type') ?? ''

    let sessionId = ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      sessionId = body.session_id
    } else {
      const formData = await request.formData()
      sessionId = String(formData.get('session_id') ?? '')
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id wajib dikirim' },
        { status: 400 }
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session tidak ditemukan' },
        { status: 404 }
      )
    }

    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('session_id', session.id)

    if (messagesError) {
      return NextResponse.json(
        { error: 'Gagal menghapus pesan: ' + messagesError.message },
        { status: 500 }
      )
    }

    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', session.id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Gagal menghapus riwayat: ' + deleteError.message },
        { status: 500 }
      )
    }

    const referer = request.headers.get('referer')
    const redirectUrl =
      referer && !referer.includes(sessionId)
        ? referer
        : `${request.nextUrl.origin}/dashboard`

    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(redirectUrl, 303)
    }

    return NextResponse.json({
      success: true,
      message: 'Riwayat berhasil dihapus',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus riwayat' },
      { status: 500 }
    )
  }
}
