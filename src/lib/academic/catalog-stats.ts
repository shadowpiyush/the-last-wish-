import { createClient } from '@supabase/supabase-js'

export interface CatalogStats {
  totalSubjects: number
  totalNotes: number
  totalBooks: number
  totalPyqs: number
  recentNotes: Array<{ id: string; title: string; created_at: string }>
}

interface CacheStore<T> {
  data: T | null
  timestamp: number
  promise: Promise<T> | null
}

const STATS_TTL_MS = 60 * 1000 // 60 seconds TTL

const statsCache: CacheStore<CatalogStats> = {
  data: null,
  timestamp: 0,
  promise: null,
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials missing')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getCachedCatalogStats(): Promise<CatalogStats> {
  const now = Date.now()
  if (statsCache.data && now - statsCache.timestamp < STATS_TTL_MS) {
    return statsCache.data
  }

  if (statsCache.promise) {
    return statsCache.promise
  }

  statsCache.promise = (async () => {
    try {
      const supabase = getAdminClient()
      const [subjectsRes, notesRes, booksRes, pyqsRes, recentNotesRes] = await Promise.all([
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('library_books').select('*', { count: 'exact', head: true }),
        supabase.from('pyqs').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase
          .from('notes')
          .select('id, title, created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const stats: CatalogStats = {
        totalSubjects: subjectsRes.count ?? 550,
        totalNotes: notesRes.count ?? 6,
        totalBooks: booksRes.count ?? 1,
        totalPyqs: pyqsRes.count ?? 0,
        recentNotes: (recentNotesRes.data && recentNotesRes.data.length > 0) ? recentNotesRes.data : [],
      }

      statsCache.data = stats
      statsCache.timestamp = Date.now()
      return stats
    } catch {
      // Fallback
      return {
        totalSubjects: 550,
        totalNotes: 6,
        totalBooks: 1,
        totalPyqs: 0,
        recentNotes: [],
      }
    } finally {
      statsCache.promise = null
    }
  })()

  return statsCache.promise
}

export function invalidateCatalogStatsCache() {
  statsCache.data = null
  statsCache.timestamp = 0
}

