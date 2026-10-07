import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import fs from 'fs';
import assert from 'node:assert/strict';

// Load .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        process.env[key] = process.env[key] || val;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function getAuthCookies(email) {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate link for ${email}: ${linkErr?.message}`);
  }

  const cookiesObj = {};
  const ssrClient = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return Object.entries(cookiesObj).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookiesObj[name] = value;
        });
      },
    },
  });

  await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  });

  return Object.entries(cookiesObj).map(([name, value]) => ({
    name,
    value,
    domain: 'localhost',
    path: '/',
  }));
}

async function runTest() {
  console.log('\n======================================================');
  console.log('TESTING CLOUDFLARE EBOOK STREAMING & ACCELERATED READER');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function report(condition, name, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Test view-url API returns accelerated streamUrl
  console.log('1. Testing /api/storage/view-url endpoint for Cloudflare R2...');
  const t0 = Date.now();
  const testKey = 'ebooks/060ceac8-a9bd-4dda-981b-0dd25ef334da/higher-engineering-mathematics-.pdf';
  const viewRes = await fetch(`${BASE_URL}/api/storage/view-url?bucket=ebooks&path=${encodeURIComponent(testKey)}`);
  const viewTime = Date.now() - t0;
  report(viewRes.status === 200, 'view-url returns HTTP 200 OK');
  report(viewTime < 1000, `view-url responds quickly (${viewTime}ms < 1000ms)`);

  const viewData = await viewRes.json();
  report(viewData.success === true, 'view-url returns success: true');
  report(viewData.url && viewData.url.startsWith('/api/storage/stream'), `view-url returns streaming URL (${viewData.url})`);
  report(viewData.provider === 'r2', 'view-url identifies Cloudflare R2 provider');

  // 2. Test Range requests on /api/storage/stream endpoint
  console.log('\n2. Testing /api/storage/stream HTTP 206 Partial Content Range streaming...');
  const tStream0 = Date.now();
  const rangeRes = await fetch(`${BASE_URL}/api/storage/stream?bucket=ebooks&path=${encodeURIComponent(testKey)}`, {
    headers: { 'Range': 'bytes=0-4096' },
  });
  const streamLatency = Date.now() - tStream0;
  report(rangeRes.status === 206, 'Stream route responds with HTTP 206 Partial Content');
  report(rangeRes.headers.get('accept-ranges') === 'bytes', 'Stream route advertises Accept-Ranges: bytes');
  report(rangeRes.headers.get('content-range')?.startsWith('bytes 0-4096/'), `Content-Range header present (${rangeRes.headers.get('content-range')})`);
  report(rangeRes.headers.get('content-type') === 'application/pdf', 'Content-Type is application/pdf');
  report(streamLatency < 1500, `Initial chunk streamed in ${streamLatency}ms (< 1500ms)`);

  const chunkBuf = await rangeRes.arrayBuffer();
  report(chunkBuf.byteLength === 4097, `Correct chunk length received (${chunkBuf.byteLength} bytes)`);

  // 3. Test end-of-file range (xref table)
  console.log('\n3. Testing End-of-file xref range streaming...');
  const totalLength = parseInt(rangeRes.headers.get('content-range').split('/')[1], 10);
  const endRange = `bytes=${totalLength - 4096}-${totalLength - 1}`;
  const endRes = await fetch(`${BASE_URL}/api/storage/stream?bucket=ebooks&path=${encodeURIComponent(testKey)}`, {
    headers: { 'Range': endRange },
  });
  report(endRes.status === 206, 'End-of-file xref chunk returns HTTP 206');
  const endBuf = await endRes.arrayBuffer();
  report(endBuf.byteLength === 4096, `End xref chunk received (${endBuf.byteLength} bytes)`);

  // 4. Test in Real Google Chrome via Puppeteer
  console.log('\n4. Testing Real Browser UI eBook Reader Opening...');
  const cookies = await getAuthCookies('250109010@hbtu.ac.in');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setCookie(...cookies);

    await page.goto(`${BASE_URL}/library`, { waitUntil: 'networkidle2' });
    report(page.url().includes('/library'), 'Navigated to /library as authenticated student');

    const readBtn = await page.waitForSelector('button ::-p-text(Read Online)', { timeout: 10000 });
    report(Boolean(readBtn), 'Found "Read Online" button');

    const clickStart = Date.now();
    await readBtn.click();

    // Verify modal appeared and iframe is present
    await page.waitForSelector('iframe', { timeout: 10000 });
    const modalLatency = Date.now() - clickStart;
    report(modalLatency < 2000, `Reader modal appeared in ${modalLatency}ms (< 2000ms)`);

    const iframeSrc = await page.$eval('iframe', el => el.src);
    report(iframeSrc.includes('/api/storage/stream'), `Iframe loaded stream URL: ${iframeSrc.slice(0, 70)}...`);

    // Verify Full Screen action button is available
    const hasFullScreen = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.some(a => a.innerText.includes('Full Screen'));
    });
    report(hasFullScreen, 'Full Screen action button rendered in reader toolbar');

  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
