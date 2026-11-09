import { createClient } from '@supabase/supabase-js'

export interface CachedProgram {
  id: string
  name: string
  short_code: string
  duration_years: number
  total_semesters: number
}

export interface CachedBranch {
  id: string
  program_id: string
  name: string
  code: string
}

export interface CachedSubject {
  id: string
  subject_code: string
  subject_name: string
  semester_number: number
  year_number: number
  branch_id: string
  program_id?: string
  credits?: number
  hours?: number
  category?: string
}

interface CacheStore<T> {
  data: T | null
  timestamp: number
  promise: Promise<T> | null
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes in memory

const programsCache: CacheStore<CachedProgram[]> = { data: null, timestamp: 0, promise: null }
const branchesCache: CacheStore<CachedBranch[]> = { data: null, timestamp: 0, promise: null }
const subjectsByBranchCache = new Map<string, CacheStore<CachedSubject[]>>()

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials missing in server environment')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * High-performance cached retrieval of canonical Academic Programs.
 * Zero database round-trips when warm.
 */
export async function getCachedPrograms(): Promise<CachedProgram[]> {
  const now = Date.now()
  if (programsCache.data && now - programsCache.timestamp < CACHE_TTL_MS) {
    return programsCache.data
  }

  if (programsCache.promise) {
    return programsCache.promise
  }

  programsCache.promise = (async () => {
    try {
      const supabase = getAdminClient()
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, short_code, duration_years, total_semesters')
        .order('name')

      if (error) throw error
      programsCache.data = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        short_code: p.short_code,
        duration_years: p.duration_years ?? 4,
        total_semesters: p.total_semesters ?? 8,
      }))
      programsCache.timestamp = Date.now()
      return programsCache.data
    } finally {
      programsCache.promise = null
    }
  })()

  return programsCache.promise
}

/**
 * High-performance cached retrieval of all 21 Academic Branches.
 * Zero database round-trips when warm.
 */
export async function getCachedBranches(): Promise<CachedBranch[]> {
  const now = Date.now()
  if (branchesCache.data && now - branchesCache.timestamp < CACHE_TTL_MS) {
    return branchesCache.data
  }

  if (branchesCache.promise) {
    return branchesCache.promise
  }

  branchesCache.promise = (async () => {
    try {
      const supabase = getAdminClient()
      const { data, error } = await supabase
        .from('branches')
        .select('id, program_id, name, code')
        .order('code')

      if (error) throw error
      branchesCache.data = data || []
      branchesCache.timestamp = Date.now()
      return branchesCache.data
    } finally {
      branchesCache.promise = null
    }
  })()

  return branchesCache.promise
}

/**
 * High-performance cached retrieval of subjects for a given branch.
 */
export async function getCachedSubjectsForBranch(branchId: string): Promise<CachedSubject[]> {
  if (!branchId || branchId === 'all') return []
  const now = Date.now()
  const cached = subjectsByBranchCache.get(branchId)

  if (cached?.data && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  if (cached?.promise) {
    return cached.promise
  }

  const store: CacheStore<CachedSubject[]> = cached || { data: null, timestamp: 0, promise: null }
  store.promise = (async () => {
    try {
      const supabase = getAdminClient()
      const { data, error } = await supabase
        .from('subjects')
        .select('id, subject_code, subject_name, semester_number, year_number, branch_id, program_id, credits, hours, category')
        .eq('branch_id', branchId)
        .order('semester_number', { ascending: true })
        .order('subject_code', { ascending: true })

      if (error) throw error
      store.data = (data as unknown as CachedSubject[]) || []
      store.timestamp = Date.now()
      subjectsByBranchCache.set(branchId, store)
      return store.data
    } finally {
      store.promise = null
    }
  })()

  subjectsByBranchCache.set(branchId, store)
  return store.promise
}

/**
 * Invalidate cache on administrative updates or new subject imports.
 */
export function invalidateAcademicCache(type?: 'programs' | 'branches' | 'subjects') {
  if (!type || type === 'programs') {
    programsCache.data = null
    programsCache.timestamp = 0
  }
  if (!type || type === 'branches') {
    branchesCache.data = null
    branchesCache.timestamp = 0
  }
  if (!type || type === 'subjects') {
    subjectsByBranchCache.clear()
  }
}
