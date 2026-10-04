/**
 * Seed Updated Programs & Branches
 * - Adds B.Tech specialized technology branches:
 *   Food Technology, Leather and Fashion Technology, Paint Technology,
 *   Oil Technology, Plastic Technology, Biotechnology, Biochemical Technology
 * - Adds other Undergraduate/Dual Degree courses: BS-MS, B.Pharm, BBA
 * - Removes postgraduate courses (MCA, MBA, M.Tech)
 * 
 * Run: node --env-file=.env.local scripts/seed-courses-and-branches.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Harcoutian Study Hub — Programs & Branches Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Remove postgraduate courses (MCA, MBA, M.Tech, etc.)
  console.log('1. Removing Postgraduate Courses (MCA, MBA, M.Tech)...');
  const pgShortCodes = ['MCA', 'MBA', 'M.Tech', 'MTech', 'PhD', 'M.Sc'];
  
  // First delete branches belonging to these programs
  const { data: pgPrograms } = await supabase
    .from('programs')
    .select('id, short_code')
    .in('short_code', pgShortCodes);

  if (pgPrograms && pgPrograms.length > 0) {
    const pgIds = pgPrograms.map((p) => p.id);
    await supabase.from('branches').delete().in('program_id', pgIds);
    const { error: delErr } = await supabase.from('programs').delete().in('id', pgIds);
    if (delErr) {
      console.warn('   ⚠️ Note on removing PG programs:', delErr.message);
    } else {
      console.log(`   ✅ Removed ${pgPrograms.length} postgraduate programs.`);
    }
  } else {
    console.log('   ⏭  No postgraduate programs found to remove.');
  }

  // 2. Ensure academic semesters 1 to 10 exist (for BS-MS 5-year dual degree)
  console.log('\n2. Updating Academic Semesters (1-10)...');
  const semestersData = [
    { semester_number: 1, year_number: 1, name: 'Semester 1 (Autumn)' },
    { semester_number: 2, year_number: 1, name: 'Semester 2 (Spring)' },
    { semester_number: 3, year_number: 2, name: 'Semester 3 (Autumn)' },
    { semester_number: 4, year_number: 2, name: 'Semester 4 (Spring)' },
    { semester_number: 5, year_number: 3, name: 'Semester 5 (Autumn)' },
    { semester_number: 6, year_number: 3, name: 'Semester 6 (Spring)' },
    { semester_number: 7, year_number: 4, name: 'Semester 7 (Autumn)' },
    { semester_number: 8, year_number: 4, name: 'Semester 8 (Spring)' },
    { semester_number: 9, year_number: 5, name: 'Semester 9 (Autumn - Dual Degree)' },
    { semester_number: 10, year_number: 5, name: 'Semester 10 (Spring - Dual Degree)' },
  ];
  await supabase.from('academic_semesters').upsert(semestersData, { onConflict: 'semester_number' });
  console.log('   ✅ Academic semesters 1 to 10 verified.');

  // 3. Upsert Programs: B.Tech, BS-MS, B.Pharm, BBA
  console.log('\n3. Upserting Programs: B.Tech, BS-MS, B.Pharm, BBA...');
  const targetPrograms = [
    {
      name: 'Bachelor of Technology',
      short_code: 'B.Tech',
      duration_years: 4,
      total_semesters: 8,
    },
    {
      name: 'Bachelor of Science - Master of Science (Dual Degree)',
      short_code: 'BS-MS',
      duration_years: 5,
      total_semesters: 10,
    },
    {
      name: 'Bachelor of Pharmacy',
      short_code: 'B.Pharm',
      duration_years: 4,
      total_semesters: 8,
    },
    {
      name: 'Bachelor of Business Administration',
      short_code: 'BBA',
      duration_years: 3,
      total_semesters: 6,
    },
  ];

  const { data: programs, error: progErr } = await supabase
    .from('programs')
    .upsert(targetPrograms, { onConflict: 'short_code' })
    .select();

  if (progErr) {
    console.error('❌ Failed to upsert programs:', progErr.message);
    return;
  }
  console.log(`   ✅ Active Programs: ${programs.map((p) => p.short_code).join(', ')}`);

  const progMap = Object.fromEntries(programs.map((p) => [p.short_code, p.id]));

  // 4. Upsert B.Tech Branches (including all specialized Chemical Technology & Engineering branches)
  console.log('\n4. Setting up B.Tech Branches (Engineering & Specialized Tech)...');
  const btechId = progMap['B.Tech'];
  const btechBranches = [
    // Requested specialized technology branches:
    { program_id: btechId, code: 'FT', name: 'Food Technology' },
    { program_id: btechId, code: 'LFT', name: 'Leather and Fashion Technology' },
    { program_id: btechId, code: 'PT', name: 'Paint Technology' },
    { program_id: btechId, code: 'OT', name: 'Oil Technology' },
    { program_id: btechId, code: 'PL', name: 'Plastic Technology' },
    { program_id: btechId, code: 'BT', name: 'Biotechnology' },
    { program_id: btechId, code: 'BC', name: 'Biochemical Technology' },
    // Core Engineering & Computing branches:
    { program_id: btechId, code: 'CSE', name: 'Computer Science and Engineering' },
    { program_id: btechId, code: 'AIML', name: 'Computer Science and Engineering (AIML)' },
    { program_id: btechId, code: 'IT', name: 'Information Technology' },
    { program_id: btechId, code: 'ET', name: 'Electronics Engineering' },
    { program_id: btechId, code: 'EE', name: 'Electrical Engineering' },
    { program_id: btechId, code: 'ME', name: 'Mechanical Engineering' },
    { program_id: btechId, code: 'CE', name: 'Civil Engineering' },
    { program_id: btechId, code: 'CHE', name: 'Chemical Engineering' },
  ];

  const { data: seededBTech, error: btechErr } = await supabase
    .from('branches')
    .upsert(btechBranches, { onConflict: 'program_id,code' })
    .select();

  if (btechErr) {
    console.error('❌ Error inserting B.Tech branches:', btechErr.message);
  } else {
    console.log(`   ✅ Inserted/Updated ${seededBTech.length} B.Tech branches:`);
    seededBTech.forEach((b) => console.log(`      • [${b.code}] ${b.name}`));
  }

  // 5. Upsert Other Courses Branches
  console.log('\n5. Setting up Branches for Other Courses (BS-MS, B.Pharm, BBA)...');
  const otherBranches = [];

  // BS-MS
  if (progMap['BS-MS']) {
    otherBranches.push(
      { program_id: progMap['BS-MS'], code: 'MDS', name: 'Mathematics and Data Science' },
      { program_id: progMap['BS-MS'], code: 'PHY', name: 'Physics' },
      { program_id: progMap['BS-MS'], code: 'CHY', name: 'Chemistry' }
    );
  }

  // B.Pharm
  if (progMap['B.Pharm']) {
    otherBranches.push(
      { program_id: progMap['B.Pharm'], code: 'PHARM', name: 'Pharmacy' }
    );
  }

  // BBA
  if (progMap['BBA']) {
    otherBranches.push(
      { program_id: progMap['BBA'], code: 'BBA', name: 'Business Administration' }
    );
  }

  const { data: seededOther, error: otherErr } = await supabase
    .from('branches')
    .upsert(otherBranches, { onConflict: 'program_id,code' })
    .select();

  if (otherErr) {
    console.error('❌ Error inserting other course branches:', otherErr.message);
  } else {
    console.log(`   ✅ Inserted/Updated ${seededOther.length} branches for Other Courses:`);
    seededOther.forEach((b) => console.log(`      • [${b.code}] ${b.name}`));
  }

  // 6. Seed Representative Subjects for Specialized Branches
  console.log('\n6. Seeding Core Subjects for Specialized Branches...');
  const allBranches = [...(seededBTech || []), ...(seededOther || [])];
  const branchMap = Object.fromEntries(allBranches.map((b) => [`${b.program_id}_${b.code}`, b.id]));

  const sampleSubjects = [
    // Food Technology
    {
      subject_code: 'FT-201',
      subject_name: 'Food Chemistry & Nutrition',
      program_id: btechId,
      branch_code: 'FT',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'FT-202',
      subject_name: 'Food Microbiology & Safety',
      program_id: btechId,
      branch_code: 'FT',
      year_number: 2,
      semester_number: 4,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'FT-301',
      subject_name: 'Food Processing & Preservation Technology',
      program_id: btechId,
      branch_code: 'FT',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },

    // Paint Technology
    {
      subject_code: 'PT-201',
      subject_name: 'Introduction to Paints & Surface Coatings',
      program_id: btechId,
      branch_code: 'PT',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'PT-301',
      subject_name: 'Polymer Chemistry & Synthetic Resins',
      program_id: btechId,
      branch_code: 'PT',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },

    // Oil Technology
    {
      subject_code: 'OT-201',
      subject_name: 'Chemistry of Fats, Oils & Fatty Acids',
      program_id: btechId,
      branch_code: 'OT',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'OT-301',
      subject_name: 'Oil Refining, Hydrogenation & By-products',
      program_id: btechId,
      branch_code: 'OT',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },

    // Plastic Technology
    {
      subject_code: 'PL-201',
      subject_name: 'Polymer Science & Engineering',
      program_id: btechId,
      branch_code: 'PL',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'PL-301',
      subject_name: 'Plastics Processing Technology & Mould Design',
      program_id: btechId,
      branch_code: 'PL',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },

    // Biotechnology
    {
      subject_code: 'BT-201',
      subject_name: 'Cell Biology & Genetics',
      program_id: btechId,
      branch_code: 'BT',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'BT-301',
      subject_name: 'Recombinant DNA Technology & Genetic Engineering',
      program_id: btechId,
      branch_code: 'BT',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },

    // Biochemical Technology
    {
      subject_code: 'BC-201',
      subject_name: 'Biochemical Engineering Principles',
      program_id: btechId,
      branch_code: 'BC',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'BC-301',
      subject_name: 'Bioreactor Design & Enzyme Engineering',
      program_id: btechId,
      branch_code: 'BC',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },

    // Leather & Fashion Technology
    {
      subject_code: 'LFT-201',
      subject_name: 'Raw Materials & Leather Chemistry',
      program_id: btechId,
      branch_code: 'LFT',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'LFT-301',
      subject_name: 'Footwear & Fashion Product Design Technology',
      program_id: btechId,
      branch_code: 'LFT',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },

    // Computer Science and Engineering (AIML)
    {
      subject_code: 'AIML-201',
      subject_name: 'Foundations of Artificial Intelligence & Knowledge Representation',
      program_id: btechId,
      branch_code: 'AIML',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'AIML-202',
      subject_name: 'Machine Learning Algorithms & Techniques',
      program_id: btechId,
      branch_code: 'AIML',
      year_number: 2,
      semester_number: 4,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'AIML-301',
      subject_name: 'Deep Learning & Neural Architectures',
      program_id: btechId,
      branch_code: 'AIML',
      year_number: 3,
      semester_number: 5,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'AIML-302',
      subject_name: 'Natural Language Processing & Computer Vision',
      program_id: btechId,
      branch_code: 'AIML',
      year_number: 3,
      semester_number: 6,
      credits: 4.0,
      category: 'Core',
    },

    // B.Pharm
    {
      subject_code: 'BP-101T',
      subject_name: 'Human Anatomy & Physiology I',
      program_id: progMap['B.Pharm'],
      branch_code: 'PHARM',
      year_number: 1,
      semester_number: 1,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'BP-201T',
      subject_name: 'Pharmaceutical Organic Chemistry II',
      program_id: progMap['B.Pharm'],
      branch_code: 'PHARM',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },

    // BBA
    {
      subject_code: 'BBA-101',
      subject_name: 'Principles of Management & Organizational Behaviour',
      program_id: progMap['BBA'],
      branch_code: 'BBA',
      year_number: 1,
      semester_number: 1,
      credits: 3.0,
      category: 'Core',
    },
    {
      subject_code: 'BBA-201',
      subject_name: 'Financial Management & Cost Accounting',
      program_id: progMap['BBA'],
      branch_code: 'BBA',
      year_number: 2,
      semester_number: 3,
      credits: 3.0,
      category: 'Core',
    },

    // BS-MS (Mathematics and Data Science)
    {
      subject_code: 'MDS-101',
      subject_name: 'Calculus, Linear Algebra & Probability',
      program_id: progMap['BS-MS'],
      branch_code: 'MDS',
      year_number: 1,
      semester_number: 1,
      credits: 4.0,
      category: 'Core',
    },
    {
      subject_code: 'MDS-201',
      subject_name: 'Statistical Inference & Data Analysis',
      program_id: progMap['BS-MS'],
      branch_code: 'MDS',
      year_number: 2,
      semester_number: 3,
      credits: 4.0,
      category: 'Core',
    },
  ];

  const validSubjects = sampleSubjects
    .filter((s) => s.program_id && branchMap[`${s.program_id}_${s.branch_code}`])
    .map((s) => ({
      subject_code: s.subject_code,
      subject_name: s.subject_name,
      program_id: s.program_id,
      branch_id: branchMap[`${s.program_id}_${s.branch_code}`],
      year_number: s.year_number,
      semester_number: s.semester_number,
      credits: s.credits,
      category: s.category,
      status: 'active',
    }));

  const { data: insertedSubjects, error: subjErr } = await supabase
    .from('subjects')
    .upsert(validSubjects, { onConflict: 'subject_code,branch_id,semester_number' })
    .select();

  if (subjErr) {
    console.error('❌ Error inserting subjects:', subjErr.message);
  } else {
    console.log(`   ✅ Inserted/Updated ${insertedSubjects.length} subjects for newly configured branches.`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Course & Branch restructuring complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
