import { NextResponse } from 'next/server'
import { getCachedSubjectsForBranch, type CachedSubject } from '@/lib/academic/cache'

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

    return NextResponse.json(
      {
        success: true,
        subjects,
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
