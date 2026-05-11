import { NextRequest, NextResponse } from 'next/server'
import { searchPapers } from '@/lib/openalex'
import { createServerSupabaseClient } from '@/lib/supabase.server'

export async function GET(req: NextRequest) {
  try {
    // Cek auth
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil query params
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const yearFrom = searchParams.get('year_from')
    const openAccess = searchParams.get('open_access')
    const perPage = searchParams.get('per_page')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter q is required' },
        { status: 400 }
      )
    }

    // Search papers
    const papers = await searchPapers(query, {
      year_from: yearFrom ? parseInt(yearFrom) : 2019,
      open_access: openAccess === 'true',
      per_page: perPage ? parseInt(perPage) : 10
    })

    return NextResponse.json({ papers })

  } catch (error) {
    console.error('Reference search error:', error)
    return NextResponse.json(
      { error: 'Gagal mencari referensi' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Simpan referensi ke library user
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paper, sessionId } = await req.json()

    const { data, error } = await supabase
      .from('paper_references')
      .insert({
        session_id: sessionId,
        judul: paper.title,
        penulis: paper.authors,
        tahun: paper.year,
        jurnal: paper.journal,
        doi: paper.doi,
        url: paper.url,
        abstrak: paper.abstract,
        sitasi_count: paper.cited_by_count
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ reference: data })

  } catch (error) {
    console.error('Save reference error:', error)
    return NextResponse.json(
      { error: 'Gagal simpan referensi' },
      { status: 500 }
    )
  }
}
