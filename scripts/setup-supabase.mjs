/**
 * Supabase Setup Script
 * Run: node scripts/setup-supabase.mjs
 * 
 * Tests connection, creates storage buckets, and verifies the setup.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Make sure .env.local exists with your Supabase credentials.');
  process.exit(1);
}

// Service-role client bypasses RLS — admin access
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testConnection() {
  console.log('\n🔌 Testing Supabase connection...');
  console.log(`   URL: ${SUPABASE_URL}`);
  
  // Simple health check — try to list auth users
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
  if (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
  console.log('✅ Connected to Supabase successfully!');
  console.log(`   Total auth users: ${data.total ?? data.users?.length ?? 0}`);
  return true;
}

async function createStorageBuckets() {
  console.log('\n📦 Setting up storage buckets...');

  const buckets = [
    {
      id: 'notes',
      name: 'notes',
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    },
    {
      id: 'pyqs',
      name: 'pyqs',
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf'],
    },
    {
      id: 'ebooks',
      name: 'ebooks',
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['application/pdf', 'application/epub+zip'],
    },
    {
      id: 'avatars',
      name: 'avatars',
      public: true,
      fileSizeLimit: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    },
    {
      id: 'covers',
      name: 'covers',
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  ];

  for (const bucket of buckets) {
    const { data: existing } = await supabase.storage.getBucket(bucket.id);
    if (existing) {
      console.log(`   ⏭  Bucket "${bucket.id}" already exists — skipping`);
      continue;
    }

    const { data, error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    });

    if (error) {
      console.error(`   ❌ Failed to create bucket "${bucket.id}":`, error.message);
    } else {
      console.log(`   ✅ Created bucket "${bucket.id}" (public: ${bucket.public})`);
    }
  }
}

async function checkTables() {
  console.log('\n📊 Checking database tables...');

  const tables = [
    'programs', 'branches', 'academic_semesters', 'subjects',
    'syllabus_units', 'syllabus_topics', 'profiles', 'notes',
    'library_books', 'ebook_requests', 'reading_progress', 'pyqs',
    'admin_audit_logs', 'activity_events'
  ];

  const existing = [];
  const missing = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      missing.push(table);
    } else {
      existing.push(table);
    }
  }

  if (existing.length > 0) {
    console.log(`   ✅ Found ${existing.length} tables: ${existing.join(', ')}`);
  }
  if (missing.length > 0) {
    console.log(`   ⚠️  Missing ${missing.length} tables: ${missing.join(', ')}`);
    console.log('   → Run supabase/schema.sql in your Supabase SQL Editor to create them.');
    return false;
  }
  
  console.log('   ✅ All required tables exist!');
  return true;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Harcoutian Study Hub — Supabase Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const connected = await testConnection();
  if (!connected) process.exit(1);

  await createStorageBuckets();
  const tablesOk = await checkTables();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (tablesOk) {
    console.log('  ✅ Setup complete! Run: npm run dev');
  } else {
    console.log('  ⚠️  Storage buckets ready, but database tables need to be created.');
    console.log('  → Open Supabase Dashboard → SQL Editor → paste supabase/schema.sql → Run');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
