import { NextResponse } from 'next/server'
import { getCachedSubjectsForBranch, type CachedSubject } from '@/lib/academic/cache'
import { createClient } from '@/lib/supabase/server'

export interface SubjectWithNotesCount extends CachedSubject {
  notesCount: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    const semester = searchParams.get('semester')
    const year = searchParams.get('year')
    const programId = searchParams.get('programId')

    let subjects: CachedSubject[] = []

    if (branchId && branchId !== 'all') {
      const allBranchSubjects = await getCachedSubjectsForBranch(branchId)
      subjects = allBranchSubjects.filter((s) => {
        if (semester && semester !== 'all' && s.semester_number !== Number(semester)) return false
        if (year && year !== 'all' && s.year_number !== Number(year)) return false
        if (programId && programId !== 'all' && s.program_id && s.program_id !== programId) return false
        return true
      })
    }

    // Fetch published notes count for these subjects
    const supabase = await createClient()
    const subjectIds = subjects.map((s) => s.id)
    const countsMap: Record<string, number> = {}

    if (subjectIds.length > 0) {
      const { data: notesData } = await supabase
        .from('notes')
        .select('subject_id')
        .in('subject_id', subjectIds)
        .eq('status', 'published')

      if (notesData) {
        for (const n of notesData) {
          if (n.subject_id) {
            countsMap[n.subject_id] = (countsMap[n.subject_id] || 0) + 1
          }
        }
      }
    }

    const subjectsWithCounts: SubjectWithNotesCount[] = subjects.map((s) => ({
      ...s,
      notesCount: countsMap[s.id] || 0,
    }))

    return NextResponse.json(
      {
        success: true,
        subjects: subjectsWithCounts,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
