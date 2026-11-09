import { spawn } from 'child_process'
import http from 'http'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const PORT = 3056
const BASE_URL = `http://localhost:${PORT}`

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function getAuthCookieHeader(email) {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate link for ${email}: ${linkErr?.message}`)
  }

  const cookiesObj = {}
  const ssrClient = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return Object.entries(cookiesObj).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookiesObj[name] = value
        })
      },
    },
  })

  await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  })

  return Object.entries(cookiesObj)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ')
}

function waitForServer(url, timeout = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode < 500) resolve(true)
        else setTimeout(check, 500)
      }).on('error', () => {
        if (Date.now() - start > timeout) reject(new Error('Server start timed out'))
        else setTimeout(check, 500)
      })
    }
    check()
  })
}

function timeRequest(path, cookieHeader = '') {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    }
    const t0 = performance.now()
    const req = http.get(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        const t1 = performance.now()
        resolve({
          path,
          status: res.statusCode,
          durationMs: Number((t1 - t0).toFixed(2)),
          sizeBytes: Buffer.byteLength(data),
          cacheControl: res.headers['cache-control'] || 'none',
        })
      })
    })
    req.on('error', (err) => {
      const t1 = performance.now()
      resolve({
        path,
        status: 0,
        durationMs: Number((t1 - t0).toFixed(2)),
        sizeBytes: 0,
        error: err.message,
      })
    })
  })
}

async function run() {
  console.log('Generating student session cookie for ranjandharmshil@gmail.com...')
  const authCookie = await getAuthCookieHeader('ranjandharmshil@gmail.com')

  console.log('🚀 Starting Next.js production server on port', PORT, '...')
  const proc = spawn('/Users/arvindrajput/.node/bin/npm', ['run', 'start', '--', '-p', String(PORT)], {
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) },
  })

  proc.stderr.on('data', d => console.error('Next stderr:', d.toString()))

  try {
    await waitForServer(BASE_URL)
    console.log('✅ Server ready. Commencing comprehensive baseline benchmarks...\n')

    const routes = [
      { path: '/', auth: false },
      { path: '/auth', auth: false },
      { path: '/dashboard', auth: true },
      { path: '/notes', auth: true },
      { path: '/attendance', auth: true },
      { path: '/library', auth: true },
      { path: '/syllabus', auth: true },
      { path: '/curriculum', auth: true },
      { path: '/pyq', auth: true },
      { path: '/api/notes?limit=10', auth: true },
      { path: '/api/notes/subjects?branchId=179591ff-0faf-416a-a7e4-9477e92634a2', auth: false },
      { path: '/api/attendance/summary', auth: true },
      { path: '/api/attendance', auth: true },
      { path: '/api/storage/stream?bucket=notes&path=workshop-practice-nws-102-welding-shop.pdf', auth: false },
    ]

    // Warm-up pass
    for (const r of routes) {
      await timeRequest(r.path, r.auth ? authCookie : '')
    }

    // Benchmark measurement passes (average of 3 passes)
    const measurements = {}
    for (const r of routes) {
      measurements[r.path] = []
    }

    for (let pass = 1; pass <= 3; pass++) {
      for (const r of routes) {
        const res = await timeRequest(r.path, r.auth ? authCookie : '')
        measurements[r.path].push(res)
      }
    }

    const summaryTable = routes.map(r => {
      const passes = measurements[r.path]
      const avgDuration = (passes.reduce((acc, p) => acc + p.durationMs, 0) / passes.length).toFixed(2)
      const last = passes[passes.length - 1]
      return {
        Route: r.path,
        Auth: r.auth ? 'Yes (Student)' : 'No (Public)',
        Status: last.status,
        'Avg Latency (ms)': Number(avgDuration),
        'Min Latency (ms)': Number(Math.min(...passes.map(p => p.durationMs)).toFixed(2)),
        'Payload (KB)': (last.sizeBytes / 1024).toFixed(1),
        'Cache Control': last.cacheControl.slice(0, 30),
      }
    })

    console.log('📊 COMPLETE END-TO-END BASELINE PERFORMANCE REPORT:')
    console.table(summaryTable)

  } finally {
    proc.kill('SIGINT')
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
