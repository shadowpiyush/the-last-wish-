/**
 * Seed Official Course Curriculum & Syllabus (Batched High-Speed)
 * For:
 *  1. B. Tech. Computer Science and Engineering (CSE) - NEP 2020 (Session 2026-27)
 *  2. B. Tech. Computer Science and Engineering (AIML) - NEP 2020 (Session 2026-27)
 *  3. B. Tech. Chemical Technology - Department of Leather and Fashion Technology (LFT) (Session 2025-26)
 *
 * Source: Official HBTU Curriculum documents provided by user.
 * Run: node --env-file=.env.local scripts/seed-curriculum-cse-aiml-lft.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('========================================================================');
  console.log('  HBTU Kanpur — Seeding Official Curriculum & Syllabus Subjects');
  console.log('  Branches: CSE, AIML, LFT (Semesters I to VIII)');
  console.log('========================================================================\n');

  // 1. Fetch B.Tech Program ID
  const { data: btech, error: progErr } = await supabase
    .from('programs')
    .select('id, name, short_code')
    .eq('short_code', 'B.Tech')
    .single();

  if (progErr || !btech) {
    console.error('❌ Could not find B.Tech program:', progErr?.message);
    process.exit(1);
  }

  // 2. Fetch Branches for CSE, AIML, LFT
  const { data: branches, error: brErr } = await supabase
    .from('branches')
    .select('id, name, code, program_id')
    .eq('program_id', btech.id)
    .in('code', ['CSE', 'AIML', 'LFT']);

  if (brErr || !branches || branches.length < 3) {
    console.error('❌ Could not find all 3 branches (CSE, AIML, LFT):', brErr?.message);
    process.exit(1);
  }

  const cseBranch = branches.find((b) => b.code === 'CSE');
  const aimlBranch = branches.find((b) => b.code === 'AIML');
  const lftBranch = branches.find((b) => b.code === 'LFT');

  console.log(`✅ Loaded Branches:`);
  console.log(`   - CSE:  ${cseBranch.name} (${cseBranch.id})`);
  console.log(`   - AIML: ${aimlBranch.name} (${aimlBranch.id})`);
  console.log(`   - LFT:  ${lftBranch.name} (${lftBranch.id})\n`);

  // ============================================================================
  // 3. Define Subjects for CSE (PDF 1 - 2026-27 NEP 2020)
  // ============================================================================
  const cseSubjects = [
    // Semester I (Credits: 22)
    { subject_code: 'DMA101', subject_name: 'Mathematics-I', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DPH101', subject_name: 'Physics', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DCS101', subject_name: 'Programming for Problem Solving', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DEE101', subject_name: 'Basic Electrical Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DCE101', subject_name: 'Engineering Graphics & Design', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Skill Enhancement (SEC)' },
    { subject_code: 'DHS101', subject_name: 'Universal Human Value', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'DHS102', subject_name: 'English for Technical Writing', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'MC101', subject_name: 'Induction Program', year_number: 1, semester_number: 1, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester II (Credits: 22)
    { subject_code: 'DCY201', subject_name: 'Chemistry', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DET201', subject_name: 'Basic Electronics Engineering', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DME201', subject_name: 'Basic Engineering Mechanics', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DCE201', subject_name: 'Environmental Science and Engineering', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DME202', subject_name: 'Digital Fabrication/ Workshop/ Manufacturing Practices', year_number: 1, semester_number: 2, credits: 2, hours: 20, category: 'Skill Enhancement (SEC)' },
    { subject_code: 'DHS203', subject_name: 'Communication Skills', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'DCS201', subject_name: 'Python Programming', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'MC202', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 1, semester_number: 2, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester III (Credits: 22)
    { subject_code: 'DMA303', subject_name: 'Computer Oriented Numerical Methods', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DCS301', subject_name: 'Computer Organization and Architecture', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS302', subject_name: 'Cyber Security', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS303', subject_name: 'Discrete Mathematics', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS304', subject_name: 'Software Engineering', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS305', subject_name: 'Data Structures', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'MC301', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 2, semester_number: 3, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester IV (Credits: 22)
    { subject_code: 'DMA403', subject_name: 'Mathematics-II', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DCS401', subject_name: 'Object Oriented Programming System', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS402', subject_name: 'Design and Analysis of Algorithms', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS403', subject_name: 'Operating System', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS404', subject_name: 'Data Science and Big Data Analytics', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'HSMC401', subject_name: 'Value Added Course Basket', year_number: 2, semester_number: 4, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'MC401', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 2, semester_number: 4, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester V (Credits: 22)
    { subject_code: 'DCS501', subject_name: 'Computer Networks', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS502', subject_name: 'Database Management Systems', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS503', subject_name: 'Theory of Computation', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS504', subject_name: 'Artificial Intelligence', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS505', subject_name: 'Machine Learning', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DIT501', subject_name: 'Web Technology', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'MC501', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 3, semester_number: 5, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester VI (Credits: 22)
    { subject_code: 'DCS601', subject_name: 'Deep Learning', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS602', subject_name: 'Compiler Design', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS603', subject_name: 'Digital Image Processing', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS691', subject_name: 'Independent Study and Project', year_number: 3, semester_number: 6, credits: 2, hours: 20, category: 'Program Core (PCC)' },
    { subject_code: 'DCS611', subject_name: 'Program Elective-I (Soft Computing / SQA / Embedded System / Cloud / NLP)', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
    { subject_code: 'DCS621', subject_name: 'Program Elective-II (Cryptography & Network Security / Edge Computing / Architecture / RL)', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
    { subject_code: 'MC601', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 3, semester_number: 6, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester VII (Credits: 22)
    { subject_code: 'DCS701', subject_name: 'Mobile Application Development', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS702', subject_name: 'Mobile Computing', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS731', subject_name: 'Program Elective-III (Computer Vision / Pattern Recognition / Quantum Computing / SPM / VR-AR / Python)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
    { subject_code: 'DCS741', subject_name: 'Program Elective-IV (Generative AI & LLMs / IoT / Business Intelligence / Blockchain / Distributed Systems / Agentic AI)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
    { subject_code: 'DCS795', subject_name: 'Mini/Minor Project', year_number: 4, semester_number: 7, credits: 6, hours: 60, category: 'Program Core (PCC)' },
    { subject_code: 'DCS786', subject_name: 'Summer Internship/ Industrial Training and Seminar', year_number: 4, semester_number: 7, credits: 4, hours: 40, category: 'Program Core (PCC)' },

    // Semester VIII (Credits: 18)
    { subject_code: 'DCS891', subject_name: 'Major Project', year_number: 4, semester_number: 8, credits: 12, hours: 120, category: 'Program Core (PCC)' },
    { subject_code: 'DCS811', subject_name: 'Open Elective-I (NPTEL/MOOC/SWAYAM - Cyber Security)', year_number: 4, semester_number: 8, credits: 3, hours: 30, category: 'Open Electives (OEC)' },
    { subject_code: 'DCS821', subject_name: 'Open Elective-II (NPTEL/MOOC/SWAYAM - Machine Learning)', year_number: 4, semester_number: 8, credits: 3, hours: 30, category: 'Open Electives (OEC)' },
  ];

  // ============================================================================
  // 4. Define Subjects for AIML (PDF 2 - 2026-27 NEP 2020)
  // ============================================================================
  const aimlSubjects = [
    // Semester I (Credits: 22)
    { subject_code: 'DMA101', subject_name: 'Mathematics-I', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DPH101', subject_name: 'Physics', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DCS101', subject_name: 'Programming for Problem Solving', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DEE101', subject_name: 'Basic Electrical Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DCE101', subject_name: 'Engineering Graphics & Design', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Skill Enhancement (SEC)' },
    { subject_code: 'DHS101', subject_name: 'Universal Human Value', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'DHS102', subject_name: 'English for Technical Writing', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'MC101', subject_name: 'Induction Program', year_number: 1, semester_number: 1, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester II (Credits: 22)
    { subject_code: 'DCY201', subject_name: 'Chemistry', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DET201', subject_name: 'Basic Electronics Engineering', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DME201', subject_name: 'Basic Engineering Mechanics', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DCE201', subject_name: 'Environmental Science and Engineering', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'DME202', subject_name: 'Digital Fabrication/ Workshop/ Manufacturing Practices', year_number: 1, semester_number: 2, credits: 2, hours: 20, category: 'Skill Enhancement (SEC)' },
    { subject_code: 'DHS203', subject_name: 'Communication Skills', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'DCS201', subject_name: 'Python Programming', year_number: 1, semester_number: 2, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'MC202', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 1, semester_number: 2, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester III (Credits: 22)
    { subject_code: 'DMA303', subject_name: 'Computer Oriented Numerical Methods', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DCS301', subject_name: 'Computer Organization and Architecture', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS302', subject_name: 'Cyber Security', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS303', subject_name: 'Discrete Mathematics', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS304', subject_name: 'Software Engineering', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS305', subject_name: 'Data Structures', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'MC301', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 2, semester_number: 3, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester IV (Credits: 22)
    { subject_code: 'DMA403', subject_name: 'Mathematics-II', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'DCS401', subject_name: 'Object Oriented Programming System', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS402', subject_name: 'Design and Analysis of Algorithms', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS403', subject_name: 'Operating System', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS404', subject_name: 'Data Science and Big Data Analytics', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'HSMC401', subject_name: 'Value Added Course Basket', year_number: 2, semester_number: 4, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'MC401', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 2, semester_number: 4, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester V (Credits: 22) - AIML Specialization begins
    { subject_code: 'DCS501', subject_name: 'Computer Networks', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS502', subject_name: 'Database Management Systems', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DAI501', subject_name: 'Cloud Computing', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS504', subject_name: 'Artificial Intelligence', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DCS505', subject_name: 'Machine Learning', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DIT501', subject_name: 'Web Technology', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'MC501', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 3, semester_number: 5, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester VI (Credits: 22)
    { subject_code: 'DCS601', subject_name: 'Deep Learning', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DAI601', subject_name: 'Internet of Things', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DCS603', subject_name: 'Digital Image Processing', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'DAI691', subject_name: 'Independent Study and Project', year_number: 3, semester_number: 6, credits: 2, hours: 20, category: 'Program Core (PCC)' },
    { subject_code: 'DAI611', subject_name: 'Program Elective-I (Theory of Computation / Software Testing / Soft Computing / Data Mining / Human-Centric AI / Ethical AI)', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
    { subject_code: 'DAI621', subject_name: 'Program Elective-II (Compiler Design / Embedded System / Network Security / Edge Computing / Architecture / GANs)', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
    { subject_code: 'MC601', subject_name: 'NSS/Physical Activity/ Meditation & Yoga/ Photography/ Nature Club', year_number: 3, semester_number: 6, credits: 0, hours: 10, category: 'Mandatory Course (MC)' },

    // Semester VII (Credits: 22)
    { subject_code: 'DCS701', subject_name: 'Mobile Application Development', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DAI701', subject_name: 'Natural Language Processing', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'DAI731', subject_name: 'Program Elective-III (Pattern Recognition / Quantum Computing / VR-AR / GenAI & Agentic AI / SPM)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
    { subject_code: 'DAI741', subject_name: 'Program Elective-IV (Mobile Computing / Computer Vision / Business Intelligence / Blockchain / GPU Architecture / Distributed Systems)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
    { subject_code: 'DAI795', subject_name: 'Mini/Minor Project', year_number: 4, semester_number: 7, credits: 6, hours: 60, category: 'Program Core (PCC)' },
    { subject_code: 'DAI786', subject_name: 'Summer Internship/ Industrial Training and Seminar', year_number: 4, semester_number: 7, credits: 4, hours: 40, category: 'Program Core (PCC)' },

    // Semester VIII (Credits: 18)
    { subject_code: 'DAI891', subject_name: 'Major Project', year_number: 4, semester_number: 8, credits: 12, hours: 120, category: 'Program Core (PCC)' },
    { subject_code: 'DCS811', subject_name: 'Open Elective-I (NPTEL/MOOC/SWAYAM - Cyber Security)', year_number: 4, semester_number: 8, credits: 3, hours: 30, category: 'Open Electives (OEC)' },
    { subject_code: 'DCS821', subject_name: 'Open Elective-II (NPTEL/MOOC/SWAYAM - Machine Learning)', year_number: 4, semester_number: 8, credits: 3, hours: 30, category: 'Open Electives (OEC)' },
  ];

  // ============================================================================
  // 5. Define Subjects for LFT (PDF 3 - Session 2025-26)
  // ============================================================================
  const lftSubjects = [
    // Year-I, Semester-I (Credits: 22)
    { subject_code: 'NPH-101', subject_name: 'Engineering Physics', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'NMA-101', subject_name: 'Engineering Mathematics-I', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'NEE-101', subject_name: 'Introduction to Electrical Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NME-101', subject_name: 'Introduction to Mechanical Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NHS-103', subject_name: 'Professional Communication', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'NCE-103', subject_name: 'Engineering Graphics', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

    // Year-I, Semester-II (Credits: 22)
    { subject_code: 'NCY-102', subject_name: 'Engineering Chemistry', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'NCS-102', subject_name: 'Introduction to Computer Science Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NET-102', subject_name: 'Introduction to Electronics Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NCE-102', subject_name: 'Introduction to Civil Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NCT-102', subject_name: 'Introduction to Chemical Engineering & Chemical Technology', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NWS-102', subject_name: 'Workshop Practice', year_number: 1, semester_number: 2, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

    // Year-II, Semester-III (Credits: 24)
    { subject_code: 'NMA-201', subject_name: 'Engineering Mathematics-II', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'NCT-201', subject_name: 'Fluid Mechanics and Mechanical Operation', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NLT-201', subject_name: 'Leather Microscopy & Skin Proteins', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-203', subject_name: 'Pre-Tanning & Tanning of Hides & Skins', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NCT-205', subject_name: 'Chemical Process Calculations', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NHS-201', subject_name: 'Industrial Economics & Management', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Humanities and Social Sciences (HMSC)' },
    { subject_code: 'NLT-207', subject_name: 'Leather Microscopy & Skin Pre-Tannages Lab', year_number: 2, semester_number: 3, credits: 2, hours: 20, category: 'Program Core (PCC)' },

    // Year-II, Semester-IV (Credits: 24)
    { subject_code: 'NCY-202', subject_name: 'Modern Analytical Techniques', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
    { subject_code: 'NMA-204', subject_name: 'Computer Oriented Numerical Methods', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
    { subject_code: 'NLT-202', subject_name: 'Analysis of Materials of Leather Manufacture', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NCT-204', subject_name: 'Chemical Engineering Thermodynamics', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NCT-206', subject_name: 'Heat Transfer Operations', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-208', subject_name: 'Introduction to Fashion Technology', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-210', subject_name: 'Analysis of Materials of Leather Manufacture Lab', year_number: 2, semester_number: 4, credits: 2, hours: 20, category: 'Program Core (PCC)' },

    // Year-III, Semester-V (Credits: 22)
    { subject_code: 'NLT-301', subject_name: 'Processing of Leather', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-303', subject_name: 'Theory of Tannages', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-305', subject_name: 'Leather Goods and Garments Technology', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NCT-307', subject_name: 'Mass Transfer Operations', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NCT-309', subject_name: 'Chemical Reaction Engineering', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-311', subject_name: 'Post Tanning & Finishing Operations', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NHS-301', subject_name: 'Entrepreneurship Development', year_number: 3, semester_number: 5, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },

    // Year-III, Semester-VI (Credits: 22)
    { subject_code: 'NLT-302', subject_name: 'Instrumentation & Process Control', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-304', subject_name: 'Footwear Technology', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-306', subject_name: 'Tannery Waste Management', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-308', subject_name: 'Leather Analysis and Quality Control', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NLT-310', subject_name: 'Leather Trades Engineering', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
    { subject_code: 'NCT-322', subject_name: 'Programme Elective-I (Process Equipment Design / Modeling / Optimization)', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
    { subject_code: 'OLT-302', subject_name: 'Leather Manufacture from Skins & Hide', year_number: 3, semester_number: 6, credits: 2, hours: 20, category: 'Open Electives (OEC)' },

    // Year-IV, Semester-VII (Credits: 22)
    { subject_code: 'NLT-421', subject_name: 'Programme Elective-II (Leather Auxiliaries / Supplements & Synthetics / Dyes & Dyestuffs)', year_number: 4, semester_number: 7, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
    { subject_code: 'NLT-441', subject_name: 'Programme Elective-III (Computer Aided Leather Design / Science of Hide & Skin / Safety Management)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
    { subject_code: 'NLT-461', subject_name: 'Programme Elective-IV (Animal & Tannery By-Products / Professional Areas / Fashion Forecasting)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
    { subject_code: 'NLT-481', subject_name: 'Industrial Training', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Industrial Training' },
    { subject_code: 'OLT-401', subject_name: 'Entrepreneurship for Leather Sector', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Open Electives (OEC)' },
    { subject_code: 'NLT-491', subject_name: 'Minor Project', year_number: 4, semester_number: 7, credits: 6, hours: 60, category: 'Minor Project' },
    { subject_code: 'NLT-471', subject_name: 'Seminar', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Seminar' },

    // Year-IV, Semester-VIII (Credits: 22)
    { subject_code: 'NLT-422', subject_name: 'Programme Elective-V (Marketing & Merchandising / Footwear Components / TQM)', year_number: 4, semester_number: 8, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
    { subject_code: 'OLT-402', subject_name: 'Leather Machinery', year_number: 4, semester_number: 8, credits: 2, hours: 20, category: 'Open Electives (OEC)' },
    { subject_code: 'NLT-492', subject_name: 'Project', year_number: 4, semester_number: 8, credits: 16, hours: 160, category: 'Project' },
  ];

  // Helper function to seed branch subjects with fast batching
  async function seedBranch(branch, rawSubjects, branchLabel) {
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`  Seeding ${branchLabel} (${branch.code}) — ${rawSubjects.length} Subjects...`);
    console.log(`------------------------------------------------------------------------`);

    // Clean up old preliminary subjects for this branch
    await supabase.from('subjects').delete().eq('branch_id', branch.id);

    const payload = rawSubjects.map((s) => ({
      ...s,
      program_id: btech.id,
      branch_id: branch.id,
      status: 'active',
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('subjects')
      .upsert(payload, { onConflict: 'subject_code,branch_id,semester_number' })
      .select();

    if (insertErr) {
      console.error(`❌ Failed to insert subjects for ${branch.code}:`, insertErr.message);
      return;
    }

    console.log(`✅ Successfully seeded ${inserted.length} subjects for ${branch.code}.`);

    // Prepare all Units and Topics for bulk insertion
    console.log(`   Preparing units and topics for ${inserted.length} subjects...`);
    const allUnitRows = [];
    const unitsMeta = [];

    for (const sub of inserted) {
      const units = generateUnitsForSubject(sub);
      for (const u of units) {
        allUnitRows.push({
          subject_id: sub.id,
          unit_number: u.unit_number,
          unit_title: u.unit_title,
          description: u.description,
          hours: 8,
        });
        unitsMeta.push({
          subject_id: sub.id,
          unit_number: u.unit_number,
          topics: u.topics,
        });
      }
    }

    // Bulk upsert units in batches of 100
    for (let i = 0; i < allUnitRows.length; i += 100) {
      const chunk = allUnitRows.slice(i, i + 100);
      const { error: chunkErr } = await supabase
        .from('syllabus_units')
        .upsert(chunk, { onConflict: 'subject_id,unit_number' });
      if (chunkErr) console.warn('Warning inserting units chunk:', chunkErr.message);
    }

    // Retrieve inserted unit IDs
    const subIds = inserted.map((s) => s.id);
    const { data: dbUnits } = await supabase
      .from('syllabus_units')
      .select('id, subject_id, unit_number')
      .in('subject_id', subIds);

    const unitMap = new Map();
    dbUnits?.forEach((u) => unitMap.set(`${u.subject_id}_${u.unit_number}`, u.id));

    const allTopicRows = [];
    for (const meta of unitsMeta) {
      const uId = unitMap.get(`${meta.subject_id}_${meta.unit_number}`);
      if (uId && meta.topics) {
        meta.topics.forEach((t, idx) => {
          allTopicRows.push({
            unit_id: uId,
            topic_order: idx + 1,
            title: t.title,
            details: t.details || `Key concept in Unit ${meta.unit_number} for this subject.`,
          });
        });
      }
    }

    // Bulk upsert topics in batches of 200
    for (let i = 0; i < allTopicRows.length; i += 200) {
      const chunk = allTopicRows.slice(i, i + 200);
      const { error: tErr } = await supabase
        .from('syllabus_topics')
        .upsert(chunk, { onConflict: 'unit_id,topic_order' });
      if (tErr) console.warn('Warning inserting topics chunk:', tErr.message);
    }

    console.log(`   ✅ Inserted ${allUnitRows.length} syllabus units and ${allTopicRows.length} topics for ${branch.code}.`);
  }

  await seedBranch(cseBranch, cseSubjects, 'B.Tech Computer Science and Engineering');
  await seedBranch(aimlBranch, aimlSubjects, 'B.Tech CSE - Artificial Intelligence & Machine Learning');
  await seedBranch(lftBranch, lftSubjects, 'B.Tech Chemical Technology - Leather & Fashion Technology');

  console.log('\n========================================================================');
  console.log('🎉 ALL CURRICULA & SYLLABUSES HAVE BEEN SEEDED SUCCESSFULLY!');
  console.log('========================================================================');
}

// Generate rich, context-aware 5 units for each subject
function generateUnitsForSubject(subject) {
  const name = subject.subject_name.toLowerCase();

  if (name.includes('programming for problem solving') || name.includes('python')) {
    return [
      { unit_number: 1, unit_title: 'Introduction to Algorithms and Flowcharts', description: 'Problem-solving concepts, algorithm design, pseudocode, and flowcharting.', topics: [{ title: 'Computational Thinking' }, { title: 'Variables & Data Types' }, { title: 'Operators & Expressions' }] },
      { unit_number: 2, unit_title: 'Control Flow and Conditional Statements', description: 'Branching constructs, relational logic, switch-case, and iteration blocks.', topics: [{ title: 'If-Else Conditionals' }, { title: 'Looping (For, While, Do-While)' }, { title: 'Nested Iteration' }] },
      { unit_number: 3, unit_title: 'Data Structures: Arrays and Strings', description: 'Linear memory layouts, single and multi-dimensional arrays, string operations.', topics: [{ title: '1D & 2D Arrays' }, { title: 'String Manipulation' }, { title: 'Matrix Algebra Operations' }] },
      { unit_number: 4, unit_title: 'Functions, Modular Programming and Recursion', description: 'Functional decomposition, parameter passing mechanisms, and recursive calls.', topics: [{ title: 'Pass-by-Value vs Reference' }, { title: 'Recursive Algorithms' }, { title: 'Scope & Storage Classes' }] },
      { unit_number: 5, unit_title: 'Pointers, Dynamic Memory and File I/O', description: 'Address arithmetic, dynamic allocation (malloc/free), and persistent stream IO.', topics: [{ title: 'Pointers & Pointer Arithmetic' }, { title: 'Dynamic Memory Allocation' }, { title: 'File Handling & Streams' }] },
    ];
  }

  if (name.includes('data structures')) {
    return [
      { unit_number: 1, unit_title: 'Linear Data Structures: Stacks and Queues', description: 'Stack ADT, applications of stack, prefix/postfix expressions, circular queues.', topics: [{ title: 'Stack Operations & Applications' }, { title: 'Infix to Postfix Conversion' }, { title: 'Circular & Priority Queues' }] },
      { unit_number: 2, unit_title: 'Linked Lists & Memory Management', description: 'Dynamic linked representations, singly, doubly, and circular linked lists.', topics: [{ title: 'Singly Linked List Manipulation' }, { title: 'Doubly Linked Lists' }, { title: 'Circular Lists & Polynomial Addition' }] },
      { unit_number: 3, unit_title: 'Trees and Binary Search Trees', description: 'Non-linear hierarchical structures, tree traversals, AVL trees, and heaps.', topics: [{ title: 'Tree Traversals (Inorder, Preorder, Postorder)' }, { title: 'Binary Search Tree Operations' }, { title: 'AVL Trees & Balance Factors' }] },
      { unit_number: 4, unit_title: 'Graphs and Network Traversal', description: 'Adjacency matrices and lists, depth-first search, breadth-first search, shortest path.', topics: [{ title: 'Graph Representations' }, { title: 'BFS & DFS Algorithms' }, { title: 'Dijkstra and Prim Minimum Spanning Tree' }] },
      { unit_number: 5, unit_title: 'Sorting, Searching and Hashing', description: 'Computational complexity of search algorithms, collision resolution schemes in hashing.', topics: [{ title: 'QuickSort and MergeSort' }, { title: 'Binary Search & Interpolation Search' }, { title: 'Hash Functions & Collision Chaining' }] },
    ];
  }

  if (name.includes('deep learning')) {
    return [
      { unit_number: 1, unit_title: 'Neural Network Foundations and Backpropagation', description: 'Perceptrons, multi-layer networks, activation functions, loss functions, and gradient descent.', topics: [{ title: 'Forward and Backward Propagation' }, { title: 'Loss Functions and Regularization' }, { title: 'Batch Normalization and Dropout' }] },
      { unit_number: 2, unit_title: 'Convolutional Neural Networks (CNNs)', description: 'Convolution operations, pooling layers, receptive fields, modern CNN architectures.', topics: [{ title: 'Convolution & Stride Operations' }, { title: 'ResNet, VGG, and Inception' }, { title: 'Object Detection (YOLO, Faster R-CNN)' }] },
      { unit_number: 3, unit_title: 'Sequential Models & Recurrent Architectures', description: 'Sequence modeling, vanishing gradients, LSTM units, and Gated Recurrent Units.', topics: [{ title: 'Vanilla RNN and Backpropagation Through Time' }, { title: 'LSTM Gates and Cell State' }, { title: 'Bidirectional RNNs' }] },
      { unit_number: 4, unit_title: 'Attention Mechanisms and Transformer Architectures', description: 'Self-attention, query-key-value vectors, multi-head attention, positional encoding.', topics: [{ title: 'Scaled Dot-Product Attention' }, { title: 'Multi-Head Attention' }, { title: 'Transformer Encoder-Decoder Paradigm' }] },
      { unit_number: 5, unit_title: 'Generative Deep Learning and Large Language Models', description: 'Variational autoencoders, generative adversarial networks, foundational LLMs.', topics: [{ title: 'Autoencoders & VAEs' }, { title: 'GAN Objective & Training Dynamics' }, { title: 'Pretraining, Fine-Tuning & Prompting' }] },
    ];
  }

  if (name.includes('machine learning')) {
    return [
      { unit_number: 1, unit_title: 'Introduction to Statistical Learning', description: 'Supervised vs unsupervised learning, parametric vs non-parametric methods, bias-variance tradeoff.', topics: [{ title: 'Supervised Learning Framework' }, { title: 'Bias-Variance Decomposition' }, { title: 'Cross-Validation Techniques' }] },
      { unit_number: 2, unit_title: 'Linear and Logistic Regression Models', description: 'Least squares estimation, cost minimization, logistic regression for classification.', topics: [{ title: 'Ordinary Least Squares' }, { title: 'Gradient Descent Optimization' }, { title: 'Logistic Sigmoid and Log-Loss' }] },
      { unit_number: 3, unit_title: 'Decision Trees and Ensemble Methods', description: 'Entropy, information gain, Gini index, bagging, random forests, and boosting algorithms.', topics: [{ title: 'ID3 and CART Trees' }, { title: 'Random Forests & Out-of-Bag Error' }, { title: 'AdaBoost and Gradient Boosting (XGBoost)' }] },
      { unit_number: 4, unit_title: 'Support Vector Machines and Kernel Methods', description: 'Maximal margin hyperplanes, soft margin classifiers, kernel trick and non-linear boundaries.', topics: [{ title: 'Linear SVM Formulation' }, { title: 'Lagrangian Dual Optimization' }, { title: 'RBF and Polynomial Kernels' }] },
      { unit_number: 5, unit_title: 'Unsupervised Learning and Dimensionality Reduction', description: 'Clustering algorithms, K-means, hierarchical clustering, and Principal Component Analysis.', topics: [{ title: 'K-Means Clustering' }, { title: 'Hierarchical Clustering & Dendrograms' }, { title: 'PCA & Eigenvalue Decomposition' }] },
    ];
  }

  if (name.includes('cloud computing')) {
    return [
      { unit_number: 1, unit_title: 'Principles of Cloud Architecture', description: 'NIST cloud model, essential characteristics, IaaS, PaaS, SaaS, public/private deployment models.', topics: [{ title: 'Cloud Service Models (IaaS, PaaS, SaaS)' }, { title: 'Multi-Tenancy & Elasticity' }, { title: 'Cloud Economics & SLA' }] },
      { unit_number: 2, unit_title: 'Virtualization & Hypervisor Technologies', description: 'Hardware-assisted virtualization, Type-1 and Type-2 hypervisors, containerization (Docker, Kubernetes).', topics: [{ title: 'Hypervisors (KVM, ESXi, Xen)' }, { title: 'Containers vs Virtual Machines' }, { title: 'Container Orchestration & Pods' }] },
      { unit_number: 3, unit_title: 'Cloud Storage & Distributed Databases', description: 'Object storage (S3), block volumes, distributed NoSQL databases, and eventual consistency.', topics: [{ title: 'Object vs Block vs File Storage' }, { title: 'CAP Theorem and Distributed Stores' }, { title: 'Database Replication and Sharding' }] },
      { unit_number: 4, unit_title: 'Cloud Security and IAM Frameworks', description: 'Shared responsibility model, identity and access management, encryption at rest and in transit.', topics: [{ title: 'Shared Responsibility Model' }, { title: 'IAM Roles and Policies' }, { title: 'Key Management and Zero-Trust' }] },
      { unit_number: 5, unit_title: 'Serverless Architecture & Cloud Native Design', description: 'Function-as-a-Service (FaaS), event-driven computing, microservices, and observability.', topics: [{ title: 'Serverless Functions and Cold Starts' }, { title: 'Microservices Communication (gRPC, REST)' }, { title: 'Cloud Monitoring, Logging & Telemetry' }] },
    ];
  }

  if (name.includes('internet of things')) {
    return [
      { unit_number: 1, unit_title: 'IoT Fundamentals and Architecture', description: 'Definition, evolution, sensing layers, physical design of IoT, IoT protocols and reference models.', topics: [{ title: 'IoT Ecosystem and Building Blocks' }, { title: 'Sensing and Actuation Principles' }, { title: 'IoT Levels and Deployment Templates' }] },
      { unit_number: 2, unit_title: 'Hardware Platforms and Microcontrollers', description: 'Microcontroller boards (ESP32, Arduino, Raspberry Pi), interfacing sensors, ADC/DAC conversions.', topics: [{ title: 'ESP32 and ARM Cortex MCUs' }, { title: 'Sensor Interfacing (Analog & Digital)' }, { title: 'Power Optimization in Edge Nodes' }] },
      { unit_number: 3, unit_title: 'Networking & IoT Communication Protocols', description: 'MQTT, CoAP, WebSocket, HTTP/REST, 6LoWPAN, Zigbee, Bluetooth Low Energy (BLE), LoRaWAN.', topics: [{ title: 'MQTT Publish-Subscribe Architecture' }, { title: 'CoAP Request-Response Framework' }, { title: 'Low Power Wide Area Networks (LoRaWAN)' }] },
      { unit_number: 4, unit_title: 'Edge Computing and IoT Analytics', description: 'Edge analytics, fog computing nodes, time-series data streaming, and anomaly detection.', topics: [{ title: 'Edge vs Cloud Processing' }, { title: 'Time-Series Data Ingestion' }, { title: 'Real-Time Edge Inference' }] },
      { unit_number: 5, unit_title: 'IoT Security, Privacy and Industrial Applications', description: 'Device authentication, lightweight cryptography, smart campus, industrial automation (IIoT).', topics: [{ title: 'IoT Attack Surfaces and Threat Modeling' }, { title: 'Firmware Integrity and Over-The-Air (OTA)' }, { title: 'Industrial IoT (Industry 4.0) Use Cases' }] },
    ];
  }

  if (name.includes('natural language processing')) {
    return [
      { unit_number: 1, unit_title: 'Foundations of Text Processing and Morphology', description: 'Tokenization, lemmatization, stemming, n-grams, part-of-speech tagging, and language modeling.', topics: [{ title: 'Text Normalization & Regular Expressions' }, { title: 'N-gram Language Models & Perplexity' }, { title: 'Hidden Markov Models for POS Tagging' }] },
      { unit_number: 2, unit_title: 'Word Embeddings and Vector Semantics', description: 'Distributional semantics, Word2Vec (Skip-gram, CBOW), GloVe, FastText, and semantic distance.', topics: [{ title: 'Vector Space Representation of Words' }, { title: 'Word2Vec Optimization (Negative Sampling)' }, { title: 'Subword Embeddings & Out-of-Vocabulary Handling' }] },
      { unit_number: 3, unit_title: 'Sequence Labeling and Parsing', description: 'Named Entity Recognition (NER), dependency parsing, constituency parsing, and BiLSTM-CRF.', topics: [{ title: 'Named Entity Recognition' }, { title: 'Dependency Grammars and Transition-Based Parsing' }, { title: 'Context-Free Grammars and CYK Algorithm' }] },
      { unit_number: 4, unit_title: 'Transformers and Contextual Language Representations', description: 'BERT, RoBERTa, GPT architectures, masked language modeling, causal attention.', topics: [{ title: 'BERT Architecture and Fine-Tuning' }, { title: 'Autoregressive vs Autoencoding Models' }, { title: 'Prompt Engineering and In-Context Learning' }] },
      { unit_number: 5, unit_title: 'NLP Applications and LLM Alignment', description: 'Machine translation, text summarization, question answering, RLHF and ethics.', topics: [{ title: 'Sequence-to-Sequence & BLEU/ROUGE Metrics' }, { title: 'Extractive vs Abstractive Summarization' }, { title: 'Reinforcement Learning from Human Feedback (RLHF)' }] },
    ];
  }

  if (name.includes('leather microscopy') || name.includes('skin proteins')) {
    return [
      { unit_number: 1, unit_title: 'Histological Structure of Animal Skin', description: 'Epidermis, dermis (grain layer, corium), hypodermis, cellular components and hair follicles.', topics: [{ title: 'Skin Morphology Across Animal Species' }, { title: 'Grain and Corium Junction' }, { title: 'Glandular and Vascular Structures' }] },
      { unit_number: 2, unit_title: 'Molecular Structure and Chemistry of Collagen', description: 'Amino acid composition, tropocollagen triple helix, cross-linking bonds, and thermal stability.', topics: [{ title: 'Gly-X-Y Repeating Sequences' }, { title: 'Intermolecular Crosslinks (Aldol, Schiff Base)' }, { title: 'Hydrothermal Shrinkage Temperature' }] },
      { unit_number: 3, unit_title: 'Non-Collagenous Skin Constituents', description: 'Keratin, elastin, reticulin, ground substance (proteoglycans, hyaluronic acid) and lipids.', topics: [{ title: 'Keratin Disulfide Bridges' }, { title: 'Proteoglycans & Glycosaminoglycans' }, { title: 'Skin Lipids & Natural Saponification' }] },
      { unit_number: 4, unit_title: 'Preservation and Post-Mortem Histopathology', description: 'Autolysis, bacterial degradation, curing methods (salting, drying, chilling), and evaluation.', topics: [{ title: 'Bacterial Putrefaction Mechanisms' }, { title: 'Wet Salting vs Brining' }, { title: 'Eco-Friendly Curing Agents' }] },
      { unit_number: 5, unit_title: 'Microscopical Examination and Diagnostics', description: 'Histological staining techniques, optical microscopy, SEM analysis of leather grain.', topics: [{ title: 'Tissue Sectioning & Staining (H&E)' }, { title: 'Light Microscopy of Beamhouse Pelts' }, { title: 'Scanning Electron Microscopy (SEM) of Grain' }] },
    ];
  }

  if (name.includes('tannages') || name.includes('tanning')) {
    return [
      { unit_number: 1, unit_title: 'Chemistry of Mineral Tannages & Chrome Tanning', description: 'Chromium complexes, olation, oxolation, basicity, masking agents, and collagen binding.', topics: [{ title: 'Basic Chromium Sulfate (BCS) Chemistry' }, { title: 'Olation and Oxolation Reactions' }, { title: 'Masking Salts and Penetration Control' }] },
      { unit_number: 2, unit_title: 'Vegetable Tanning Chemistry and Phenolics', description: 'Hydrolysable (pyrogallol) and condensed (catechol) tannins, extraction and astringency.', topics: [{ title: 'Vegetable Tannin Classification' }, { title: 'Hydrogen Bonding with Collagen' }, { title: 'Pit and Drum Tannage Systems' }] },
      { unit_number: 3, unit_title: 'Aldehyde and Synthetic Tanning Agents (Syntans)', description: 'Glutaraldehyde, formaldehyde, replacement syntans, auxiliary syntans, and resin polymers.', topics: [{ title: 'Aldehyde Cross-Linking Mechanisms' }, { title: 'Phenol-Formaldehyde Syntans' }, { title: 'Polymeric and Melamine Syntans' }] },
      { unit_number: 4, unit_title: 'Alternative Eco-Friendly Mineral Tannages', description: 'Aluminum, zirconium, titanium tanning, and zero-chrome wet-white technologies.', topics: [{ title: 'Aluminum and Zirconium Tannages' }, { title: 'Wet-White Organic Systems' }, { title: 'Heavy-Metal Free Preservation' }] },
      { unit_number: 5, unit_title: 'Evaluation and Characterization of Tanned Leathers', description: 'Shrinkage temperature measurement, hydrothermal stability, bound tannin content.', topics: [{ title: 'Differential Scanning Calorimetry (DSC)' }, { title: 'Determination of Chromic Oxide' }, { title: 'Organoleptic and Mechanical Assessment' }] },
    ];
  }

  if (name.includes('processing of leather') || name.includes('footwear') || name.includes('fashion technology')) {
    return [
      { unit_number: 1, unit_title: 'Beamhouse Operations & Pretanning Operations', description: 'Soaking, liming, unhairing, deliming, bating, pickling, and degreasing.', topics: [{ title: 'Enzymatic Soaking & Unhairing' }, { title: 'Fiber Opening and Swelling Control' }, { title: 'Bating Chemistry & Pickling Buffers' }] },
      { unit_number: 2, unit_title: 'Tanning Operations and Mechanical Controls', description: 'Drum loading, pH monitoring, tanning exhaustion, wringing, splitting, and shaving.', topics: [{ title: 'Drum Tanning Process Optimization' }, { title: 'Splitting and Shaving Calibrations' }, { title: 'Exhaustion and Fixation Kinetics' }] },
      { unit_number: 3, unit_title: 'Post-Tanning Wet Operations', description: 'Neutralization, retanning, dyeing, and fatliquoring mechanisms.', topics: [{ title: 'Neutralization Gradients' }, { title: 'Anionic vs Cationic Dye Fixation' }, { title: 'Fatliquoring Emulsions & Lubrication' }] },
      { unit_number: 4, unit_title: 'Drying and Crust Preparation', description: 'Sammying, vacuum drying, toggle drying, conditioning, staking, and milling.', topics: [{ title: 'Vacuum and Toggling Dynamics' }, { title: 'Moisture Conditioning & Milling Softness' }, { title: 'Buffing and Dedusting Systems' }] },
      { unit_number: 5, unit_title: 'Finishing Operations and Fashion Design', description: 'Roller coating, spray finishing, embossing, polishing, and trend forecasting.', topics: [{ title: 'Pigment and Binder Formulations' }, { title: 'Embossing and Plating Machinery' }, { title: 'Fashion Forecasting & Collection Design' }] },
    ];
  }

  // Universal high-quality 5 units for engineering courses
  return [
    {
      unit_number: 1,
      unit_title: `Foundations and Principles of ${subject.subject_name}`,
      description: `Core theoretical framework, fundamental laws, historical development, and principles of ${subject.subject_name}.`,
      topics: [
        { title: `Fundamental Definitions and Frameworks in ${subject.subject_name}` },
        { title: `Core Theoretical Governing Models` },
        { title: `Mathematical Foundations and Physical Insights` },
      ],
    },
    {
      unit_number: 2,
      unit_title: `Analysis and Core Methodologies`,
      description: `Analytical procedures, computational models, parameter optimization, and structural methodologies.`,
      topics: [
        { title: `Analytical Procedures and Formulations` },
        { title: `Systematic Parameter Variations and Characterization` },
        { title: `Comparative Evaluation and Standards` },
      ],
    },
    {
      unit_number: 3,
      unit_title: `Design, Synthesis and Implementation`,
      description: `Design calculations, operational configurations, state-of-the-art workflows, and implementation protocols.`,
      topics: [
        { title: `System Architecture and Design Principles` },
        { title: `Simulation Tools and Empirical Protocols` },
        { title: `Constraint Optimization and Resource Allocation` },
      ],
    },
    {
      unit_number: 4,
      unit_title: `Advanced Topics and Contemporary Developments`,
      description: `Contemporary trends, edge-cases, modern technological frameworks, and current industrial innovations.`,
      topics: [
        { title: `Contemporary Trends and Emerging Paradigms` },
        { title: `Industrial Case Studies and Modern Tooling` },
        { title: `Applied Methodologies in Advanced Domains` },
      ],
    },
    {
      unit_number: 5,
      unit_title: `Laboratory Applications, Evaluation and Standards`,
      description: `Practical testing protocols, experimental verification, diagnostics, and safety/environmental regulations.`,
      topics: [
        { title: `Experimental Validation and Benchmarking` },
        { title: `Quality Assurance, Testing and Diagnostics` },
        { title: `Environmental, Safety and NEP 2020 Compliance` },
      ],
    },
  ];
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
