/**
 * Seed Academic Programs & Branches
 * Run: node --env-file=.env.local scripts/seed-academic-data.mjs
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

async function seed() {
  console.log('🌱 Seeding Academic Data into Supabase...\n');

  // 1. Programs
  const programsData = [
    { name: 'Bachelor of Technology', short_code: 'B.Tech', duration_years: 4, total_semesters: 8 },
    { name: 'Master of Computer Applications', short_code: 'MCA', duration_years: 2, total_semesters: 4 },
    { name: 'Master of Business Administration', short_code: 'MBA', duration_years: 2, total_semesters: 4 },
    { name: 'Master of Technology', short_code: 'M.Tech', duration_years: 2, total_semesters: 4 },
  ];

  console.log('1. Inserting Programs...');
  const { data: programs, error: progErr } = await supabase
    .from('programs')
    .upsert(programsData, { onConflict: 'short_code' })
    .select();

  if (progErr) {
    console.error('❌ Error inserting programs:', progErr.message);
    return;
  }
  console.log(`   ✅ Inserted/Updated ${programs.length} programs.`);

  const btech = programs.find((p) => p.short_code === 'B.Tech');
  const mca = programs.find((p) => p.short_code === 'MCA');

  if (!btech) {
    console.error('❌ B.Tech program not found');
    return;
  }

  // 2. Branches
  const btechBranches = [
    { program_id: btech.id, name: 'Computer Science and Engineering', code: 'CSE' },
    { program_id: btech.id, name: 'Information Technology', code: 'IT' },
    { program_id: btech.id, name: 'Electronics and Communication Engineering', code: 'ECE' },
    { program_id: btech.id, name: 'Electrical Engineering', code: 'EE' },
    { program_id: btech.id, name: 'Mechanical Engineering', code: 'ME' },
    { program_id: btech.id, name: 'Civil Engineering', code: 'CE' },
    { program_id: btech.id, name: 'Chemical Engineering', code: 'CHE' },
  ];

  if (mca) {
    btechBranches.push({ program_id: mca.id, name: 'Computer Applications', code: 'MCA' });
  }

  console.log('\n2. Inserting Branches...');
  const { data: branches, error: branchErr } = await supabase
    .from('branches')
    .upsert(btechBranches, { onConflict: 'program_id,code' })
    .select();

  if (branchErr) {
    console.error('❌ Error inserting branches:', branchErr.message);
    return;
  }
  console.log(`   ✅ Inserted/Updated ${branches.length} branches.`);

  const cseBranch = branches.find((b) => b.code === 'CSE');

  // 3. Sample Core Subjects for CSE
  if (cseBranch) {
    console.log('\n3. Inserting Core Subjects for CSE...');
    const subjectsData = [
      {
        subject_code: 'CSE-101',
        subject_name: 'Programming Fundamentals with C',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 1,
        semester_number: 1,
        credits: 4.0,
        category: 'Core',
      },
      {
        subject_code: 'MTH-101',
        subject_name: 'Engineering Mathematics I',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 1,
        semester_number: 1,
        credits: 4.0,
        category: 'Basic Science',
      },
      {
        subject_code: 'PHY-101',
        subject_name: 'Engineering Physics',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 1,
        semester_number: 1,
        credits: 3.0,
        category: 'Basic Science',
      },
      {
        subject_code: 'CSE-102',
        subject_name: 'Data Structures and Algorithms',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 1,
        semester_number: 2,
        credits: 4.0,
        category: 'Core',
      },
      {
        subject_code: 'CSE-201',
        subject_name: 'Database Management Systems',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 2,
        semester_number: 3,
        credits: 4.0,
        category: 'Core',
      },
      {
        subject_code: 'CSE-202',
        subject_name: 'Computer Networks',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 2,
        semester_number: 4,
        credits: 4.0,
        category: 'Core',
      },
      {
        subject_code: 'CSE-301',
        subject_name: 'Operating Systems & Architecture',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 3,
        semester_number: 5,
        credits: 4.0,
        category: 'Core',
      },
      {
        subject_code: 'CSE-302',
        subject_name: 'Software Engineering & System Design',
        program_id: btech.id,
        branch_id: cseBranch.id,
        year_number: 3,
        semester_number: 6,
        credits: 3.5,
        category: 'Core',
      },
    ];

    const { data: subjects, error: subjErr } = await supabase
      .from('subjects')
      .upsert(subjectsData, { onConflict: 'subject_code,branch_id,semester_number' })
      .select();

    if (subjErr) {
      console.error('❌ Error inserting subjects:', subjErr.message);
    } else {
      console.log(`   ✅ Inserted/Updated ${subjects.length} sample subjects.`);

      // 4. Sample Syllabus Units for DSA
      const dsa = subjects.find((s) => s.subject_code === 'CSE-102');
      if (dsa) {
        const unitsData = [
          {
            subject_id: dsa.id,
            unit_number: 1,
            unit_title: 'Introduction to Arrays, Pointers, and Recursion',
            description: 'Time and space complexity analysis, asymptotic notations, array manipulations.',
          },
          {
            subject_id: dsa.id,
            unit_number: 2,
            unit_title: 'Linked Lists & Stack Operations',
            description: 'Singly, doubly, and circular linked lists. Stack evaluation and prefix/postfix conversion.',
          },
          {
            subject_id: dsa.id,
            unit_number: 3,
            unit_title: 'Queues & Trees',
            description: 'Circular queues, priority queues, binary search trees, tree traversal algorithms.',
          },
          {
            subject_id: dsa.id,
            unit_number: 4,
            unit_title: 'Graph Algorithms & Sorting',
            description: 'BFS, DFS, Dijkstra, Prim, Kruskal, Quick Sort, Merge Sort, and Heap Sort.',
          },
        ];

        const { data: units, error: unitErr } = await supabase
          .from('syllabus_units')
          .upsert(unitsData, { onConflict: 'subject_id,unit_number' })
          .select();

        if (!unitErr) {
          console.log(`   ✅ Inserted ${units.length} syllabus units for ${dsa.subject_name}.`);
        }
      }
    }
  }

  console.log('\n🎉 Academic database seeding completed successfully!\n');
}

seed().catch(console.error);
