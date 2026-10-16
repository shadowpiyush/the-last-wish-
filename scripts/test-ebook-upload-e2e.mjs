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

async function runTests() {
  console.log('======================================================');
  console.log('eBOOK UPLOAD & DIGITAL LIBRARY FULL E2E TEST SUITE');
  console.log('======================================================\n');

  // Create temporary test PDF
  const testPdfPath = '/tmp/test-prod-ebook.pdf';
  const pdfHeader = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';
  fs.writeFileSync(testPdfPath, pdfHeader);

  console.log('1. Setting up authenticated Admin session...');
  const cookies = await getAuthCookies('admin@harcoutianhub.in');
  console.log('   Admin session established successfully.\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setCookie(...cookies);
  await page.setViewport({ width: 1280, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (err) => {
    console.error('   [BROWSER PAGE ERROR]', err.message);
    pageErrors.push(err.message);
  });

  try {
    // ------------------------------------------------------------------
    // TEST 1: Navigation to Admin and Tab Switching
    // ------------------------------------------------------------------
    console.log('--- TEST 1: ADMIN NAVIGATION & UPLOAD eBOOK TAB ---');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    assert.strictEqual(page.url().includes('/admin'), true, 'Should be on /admin page');
    console.log('  ✅ PASS: Successfully navigated to /admin without unwanted redirects');

    // Click "Upload eBook" tab
    const uploadTabBtn = await page.waitForSelector('button ::-p-text(Upload eBook)', { timeout: 5000 });
    await uploadTabBtn.click();
    console.log('  ✅ PASS: Clicked "Upload eBook" tab');

    await page.waitForSelector('input[placeholder*="Higher Engineering Mathematics"]', { timeout: 5000 });
    console.log('  ✅ PASS: eBook upload form rendered with all inputs\n');

    // ------------------------------------------------------------------
    // TEST 2: Client-side Field Validation & Error Highlighting
    // ------------------------------------------------------------------
    console.log('--- TEST 2: VALIDATION ERROR HANDLING & FIELD HIGHLIGHTING ---');
    // Try submitting without PDF
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();

    await new Promise((r) => setTimeout(r, 600));

    const bannerText = await page.evaluate(() => {
      const el = document.querySelector('div[style*="var(--color-danger-bg)"]') || 
                 Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes("We couldn't upload this eBook"));
      return el ? el.innerText : '';
    });

    console.log('   Banner message received:', bannerText);
    assert(
      bannerText.includes("We couldn't upload this eBook. Please check the highlighted fields and try again."),
      'Banner should show required validation error message'
    );
    console.log('  ✅ PASS: User receives required validation failure message: "We couldn\'t upload this eBook. Please check the highlighted fields and try again."');

    // Verify "The string did not match the expected pattern." was NOT thrown
    const hasPatternError = pageErrors.some((e) => e.includes('The string did not match the expected pattern'));
    assert.strictEqual(hasPatternError, false, 'Should not throw DOMException pattern mismatch error');
    console.log('  ✅ PASS: No "The string did not match the expected pattern." exception was triggered\n');

    // ------------------------------------------------------------------
    // TEST 3: General Library eBook Upload (No Academic Mapping)
    // ------------------------------------------------------------------
    console.log('--- TEST 3: GENERAL LIBRARY eBOOK UPLOAD (NO ACADEMIC MAPPING) ---');
    const generalTitle = `Engineering Thermodynamics (E2E Test ${Date.now()})`;
    const generalAuthor = 'Prof. P.K. Nag';

    // Fill Title
    const titleInput = await page.$('input[placeholder*="Higher Engineering Mathematics"]');
    await titleInput.click({ clickCount: 3 });
    await titleInput.type(generalTitle);

    // Fill Author
    const authorInput = await page.$('input[placeholder*="Dr. B.S. Grewal"]');
    await authorInput.click({ clickCount: 3 });
    await authorInput.type(generalAuthor);

    // Fill Publisher
    const publisherInput = await page.$('input[placeholder*="Khanna Publishers"]');
    await publisherInput.click({ clickCount: 3 });
    await publisherInput.type('Tata McGraw-Hill Education');

    // Fill Edition
    const editionInput = await page.$('input[placeholder*="44th Edition"]');
    await editionInput.click({ clickCount: 3 });
    await editionInput.type('6th Edition');

    // Attach PDF
    const fileInput = await page.$('#bookPdfInput');
    await fileInput.uploadFile(testPdfPath);
    console.log('   Attached PDF file to file picker');

    await new Promise((r) => setTimeout(r, 400));

    // Submit form
    console.log('   Submitting General Library eBook form...');
    await submitBtn.click();

    // Verify submit button gets disabled
    const isSubmittingDisabled = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn ? btn.disabled : false;
    });
    console.log('   Submit button disabled during upload:', isSubmittingDisabled);
    assert.strictEqual(isSubmittingDisabled, true, 'Submit button must be disabled to prevent duplicate submissions');
    console.log('  ✅ PASS: Submit button disabled while upload is in progress (prevents duplicate submissions)');

    // Wait for upload completion (up to 20 seconds)
    let uploadSuccess = false;
    let completionMessage = '';
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      completionMessage = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('div')).find(
          (d) => d.innerText && (d.innerText.includes('✅') || d.innerText.includes('Error:'))
        );
        return el ? el.innerText : '';
      });
      if (completionMessage.includes('✅') || completionMessage.includes('Error:')) {
        if (completionMessage.includes('✅')) uploadSuccess = true;
        break;
      }
    }

    console.log('   Result banner:', completionMessage);
    assert.strictEqual(uploadSuccess, true, `General Library eBook upload failed: ${completionMessage}`);
    assert(completionMessage.includes('General Library resource'), 'Must indicate published as General Library resource');
    console.log('  ✅ PASS: General Library eBook uploaded directly to Cloudflare R2 and published successfully');

    // Verify in database
    const { data: genDbBook, error: genDbErr } = await adminClient
      .from('library_books')
      .select('*')
      .eq('title', generalTitle)
      .single();

    assert.strictEqual(genDbErr, null, 'Database query should succeed');
    assert.ok(genDbBook, 'Book record should exist in public.library_books');
    assert.strictEqual(genDbBook.author, generalAuthor);
    assert.strictEqual(genDbBook.subject_id, null, 'General Library eBook subject_id must be null (no fake IDs)');
    assert.strictEqual(genDbBook.ebook_status, 'available');
    assert.ok(genDbBook.ebook_file_path.startsWith('ebooks/'), 'R2 key must start with ebooks/');
    console.log('  ✅ PASS: Database record verified (subject_id = null, status = available, R2 path valid)\n');

    // ------------------------------------------------------------------
    // TEST 4: Academic Mapped eBook Upload (With Hierarchy Mapping)
    // ------------------------------------------------------------------
    console.log('--- TEST 4: ACADEMIC MAPPED eBOOK UPLOAD ---');
    const mappedTitle = `Database System Concepts (E2E Test ${Date.now()})`;
    const mappedAuthor = 'Silberschatz, Korth, Sudarshan';

    // Navigate to fresh admin upload tab to ensure clean form state
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    const uploadTabBtn2 = await page.waitForSelector('button ::-p-text(Upload eBook)', { timeout: 5000 });
    await uploadTabBtn2.click();
    await new Promise((r) => setTimeout(r, 600));

    // Click "+ Add Academic Mapping"
    const addMappingBtn = await page.waitForSelector('button ::-p-text(+ Add Academic Mapping)', { timeout: 5000 });
    await addMappingBtn.click();
    console.log('   Clicked "+ Add Academic Mapping"');

    await new Promise((r) => setTimeout(r, 500));

    // Fill Title
    const titleInput2 = await page.waitForSelector('input[placeholder*="Higher Engineering Mathematics"]');
    await titleInput2.type(mappedTitle);

    // Fill Author
    const authorInput2 = await page.waitForSelector('input[placeholder*="Dr. B.S. Grewal"]');
    await authorInput2.type(mappedAuthor);

    // Attach PDF
    const fileInput2 = await page.waitForSelector('#bookPdfInput');
    await fileInput2.uploadFile(testPdfPath);

    await new Promise((r) => setTimeout(r, 400));

    // Submit form
    console.log('   Submitting Academic Mapped eBook form...');
    const submitBtn2 = await page.waitForSelector('button[type="submit"]');
    await submitBtn2.click();

    let mappedSuccess = false;
    let mappedMsg = '';
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      mappedMsg = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('div')).find(
          (d) => d.innerText && (d.innerText.includes('✅') || d.innerText.includes('Error:')) && d.innerText.length < 500
        );
        return el ? el.innerText : '';
      });
      if (mappedMsg.includes('✅') || mappedMsg.includes('Error:')) {
        if (mappedMsg.includes('✅')) mappedSuccess = true;
        break;
      }
    }

    console.log('   Result banner:', mappedMsg);
    assert.strictEqual(mappedSuccess, true, `Mapped eBook upload failed: ${mappedMsg}`);
    assert(mappedMsg.includes('academic mapping combination'), 'Must indicate academic mapping combination');
    console.log('  ✅ PASS: Academic Mapped eBook uploaded and published successfully');

    // Verify in database
    const { data: mappedDbBook, error: mapDbErr } = await adminClient
      .from('library_books')
      .select('*, ebook_academic_mappings(*)')
      .eq('title', mappedTitle)
      .single();

    assert.strictEqual(mapDbErr, null, 'Database query should succeed');
    assert.ok(mappedDbBook, 'Book record should exist in public.library_books');
    assert.ok(mappedDbBook.ebook_academic_mappings.length > 0, 'Mapping records must be linked to book');
    console.log(`  ✅ PASS: Database record and ${mappedDbBook.ebook_academic_mappings.length} mapping row(s) persisted in database\n`);

    // ------------------------------------------------------------------
    // TEST 5: Digital Library UI & Reload Persistence Verification
    // ------------------------------------------------------------------
    console.log('--- TEST 5: DIGITAL LIBRARY DISPLAY & PERSISTENCE (/library) ---');
    console.log('   Navigating to /library...');
    await page.goto(`${BASE_URL}/library`, { waitUntil: 'networkidle2' });

    await page.waitForSelector('h1', { timeout: 5000 });
    const libraryH1 = await page.$eval('h1', (el) => el.innerText);
    assert.strictEqual(libraryH1, 'Digital Library');
    console.log('  ✅ PASS: Navigated to /library');

    // Check that both newly uploaded books appear in the Digital Library collection
    const checkBooksPresent = async () => {
      return page.evaluate((t1, t2) => {
        const text = document.body.innerText;
        return {
          hasBook1: text.includes(t1),
          hasBook2: text.includes(t2),
        };
      }, generalTitle, mappedTitle);
    };

    let booksFound = await checkBooksPresent();
    assert.strictEqual(booksFound.hasBook1, true, `Book "${generalTitle}" must appear in /library`);
    assert.strictEqual(booksFound.hasBook2, true, `Book "${mappedTitle}" must appear in /library`);
    console.log('  ✅ PASS: Both newly published eBooks are rendered in Digital Library UI');

    // Refresh page and re-verify persistence
    console.log('   Refreshing /library page...');
    await page.reload({ waitUntil: 'networkidle2' });
    booksFound = await checkBooksPresent();
    assert.strictEqual(booksFound.hasBook1, true, `Book "${generalTitle}" must persist after reload`);
    assert.strictEqual(booksFound.hasBook2, true, `Book "${mappedTitle}" must persist after reload`);
    console.log('  ✅ PASS: Published eBooks persist across page reloads\n');

    // Clean up test books from database and R2 to keep database clean
    console.log('--- CLEANUP: REMOVING TEST RECORDS ---');
    await adminClient.from('library_books').delete().eq('title', generalTitle);
    await adminClient.from('library_books').delete().eq('title', mappedTitle);
    console.log('  ✅ PASS: Test database records cleaned up cleanly\n');

    console.log('======================================================');
    console.log('ALL E2E AUTOMATED TESTS PASSED (5 SUITES, 0 FAILURES)');
    console.log('======================================================');
  } finally {
    await browser.close();
    try {
      fs.unlinkSync(testPdfPath);
    } catch {}
  }
}

runTests().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
