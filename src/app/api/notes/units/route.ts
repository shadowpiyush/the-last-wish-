import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')

    if (!subjectId) {
      return NextResponse.json({ success: false, error: 'subjectId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: units, error } = await supabase
      .from('syllabus_units')
      .select('id, subject_id, unit_number, unit_title, hours, description')
      .eq('subject_id', subjectId)
      .order('unit_number', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        success: true,
        units: units || [],
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
