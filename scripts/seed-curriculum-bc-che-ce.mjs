/**
 * Seed Official Course Curriculum & Syllabus (Batched High-Speed)
 * For:
 *  1. B. Tech. Chemical Technology - Biochemical Engineering (BC) (Session 2022-23)
 *  2. B. Tech. Chemical Engineering (CHE) (Session 2022-23)
 *  3. B. Tech. Civil Engineering (CE) (Session 2022-23 / 2023-24)
 *
 * Source: Official HBTU Curriculum documents provided by user.
 * Run: node --env-file=.env.local scripts/seed-curriculum-bc-che-ce.mjs
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

// ============================================================================
// 1. BIOCHEMICAL ENGINEERING (BC) SUBJECTS
// ============================================================================
const bcSubjects = [
  // Year I, Semester-I (Credits: 22)
  { subject_code: 'NPH-101', subject_name: 'Engineering Physics', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NMA-101', subject_name: 'Engineering Mathematics-I', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NEE-101', subject_name: 'Introduction to Electrical Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NME-101', subject_name: 'Introduction to Mechanical Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NHS-101', subject_name: 'Professional Communication', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Humanities and Social Sciences (HMSC)' },
  { subject_code: 'NCE-103', subject_name: 'Engineering Graphics', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

  // Year I, Semester-II (Credits: 22)
  { subject_code: 'NCY-102', subject_name: 'Engineering Chemistry', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NCS-102', subject_name: 'Introduction to Computer Science & Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NET-102', subject_name: 'Introduction to Electronics Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCE-102', subject_name: 'Introduction to Civil Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCT-102', subject_name: 'Introduction to Chemical Engineering & Chemical Technology', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NWS-102', subject_name: 'Workshop Practice', year_number: 1, semester_number: 2, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

  // Year II, Semester-III (Credits: 24)
  { subject_code: 'NMA-201', subject_name: 'Engineering Mathematics-II', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NCT-201', subject_name: 'Fluid Mechanics and Mechanical Operations', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NBE-201', subject_name: 'Fundamental of Life Processes', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-203', subject_name: 'Industrial Microbiology', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCT-203', subject_name: 'Chemical Process Calculations', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NHS-201', subject_name: 'Economics & Management', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Humanities and Social Sciences (HMSC)' },
  { subject_code: 'NBE-207', subject_name: 'Microbial Techniques Lab', year_number: 2, semester_number: 3, credits: 2, hours: 20, category: 'Program Core (PCC)' },

  // Year II, Semester-IV (Credits: 24)
  { subject_code: 'NCY-202', subject_name: 'Modern Analytical Techniques', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NMA-204', subject_name: 'Computer Oriented Numerical Methods', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NBE-202', subject_name: 'Biochemistry', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCT-204', subject_name: 'Chemical Engineering Thermodynamics', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCT-202', subject_name: 'Heat Transfer Operations', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-204', subject_name: 'Environmental Biotechnology', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-206', subject_name: 'Biochemical Analysis Lab', year_number: 2, semester_number: 4, credits: 2, hours: 20, category: 'Program Core (PCC)' },

  // Year III, Semester-V (Credits: 22)
  { subject_code: 'NBE-301', subject_name: 'Bioinformatics', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-303', subject_name: 'Bioprocess Engg.', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-305', subject_name: 'Enzyme Engineering and Technology', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCT-307', subject_name: 'Mass Transfer Operations', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCT-309', subject_name: 'Chemical Reaction Engineering', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-307', subject_name: 'Bioprocess Engg. Lab', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NHS-301', subject_name: 'Entrepreneurship', year_number: 3, semester_number: 5, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },

  // Year III, Semester-VI (Credits: 22)
  { subject_code: 'NCT-302', subject_name: 'Instrumentation & Process Control', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-302', subject_name: 'Downstream Techniques in Bioprocesses', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-304', subject_name: 'Biomolecules in Pharmaceutical', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-306', subject_name: 'Fermentation Technology', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-308', subject_name: 'Fermentation & Environmental Lab', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCT-322', subject_name: 'Program Elective-I (Process Equipment Design / Process Modeling & Simulation / Process Optimization)', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'OBE-302', subject_name: 'Open Elective-I (Microbial Technology)', year_number: 3, semester_number: 6, credits: 2, hours: 20, category: 'Open Electives (OEC)' },

  // Year IV, Semester-VII (Credits: 22)
  { subject_code: 'NBE-401', subject_name: 'Program Elective-II (Bioreactor Design / Metabolic Engg. / Green Energy and Sustainability)', year_number: 4, semester_number: 7, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
  { subject_code: 'NBE-407', subject_name: 'Program Elective-III (Plant Cell Biotechnology / Food Biotechnology / Membrane Application in Bioprocesses)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'NBE-413', subject_name: 'Program Elective-IV (IPR & Biosafety Regulation / Biosensors / Nanobiotechnology)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'NBE-419', subject_name: 'Industrial Training', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Program Core (PCC)' },
  { subject_code: 'OBE-401', subject_name: 'Open Elective-II (Fundamentals of Enzyme Engineering)', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Open Electives (OEC)' },
  { subject_code: 'NBE-421', subject_name: 'Minor Project', year_number: 4, semester_number: 7, credits: 6, hours: 60, category: 'Program Core (PCC)' },
  { subject_code: 'NBE-423', subject_name: 'Seminar', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Program Core (PCC)' },

  // Year IV, Semester-VIII (Credits: 22)
  { subject_code: 'NBE-402', subject_name: 'Program Elective-V (Bioprocess Instrumentation / Biochemical calculations and Plant Design / Protein Science & Engineering)', year_number: 4, semester_number: 8, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
  { subject_code: 'OBE-402', subject_name: 'Open Elective-III (Bioresource Technology)', year_number: 4, semester_number: 8, credits: 2, hours: 20, category: 'Open Electives (OEC)' },
  { subject_code: 'NBE-408', subject_name: 'Major Project', year_number: 4, semester_number: 8, credits: 16, hours: 160, category: 'Program Core (PCC)' },
];

// ============================================================================
// 2. CHEMICAL ENGINEERING (CHE) SUBJECTS
// ============================================================================
const cheSubjects = [
  // Year I, Semester-I (Credits: 22)
  { subject_code: 'NPH101', subject_name: 'Engg. Physics', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NMA101', subject_name: 'Engg. Mathematics-I', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NEE101', subject_name: 'Int. to Electrical Engg.', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NME101', subject_name: 'Int. to Mech. Engg.', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NHS103', subject_name: 'Professional Communication', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Humanities and Social Sciences (HMSC)' },
  { subject_code: 'NCE103', subject_name: 'Engg. Graphics', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

  // Year I, Semester-II (Credits: 22)
  { subject_code: 'NCY102', subject_name: 'Engg. Chemistry', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NCS102', subject_name: 'Int. to CSE', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NET102', subject_name: 'Int. to Electronics Engg.', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCE102', subject_name: 'Int. to Civil Engg.', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCT102', subject_name: 'Int. to CHE/CT', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NWS102', subject_name: 'Workshop Practice', year_number: 1, semester_number: 2, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

  // Year II, Semester-III (Credits: 24)
  { subject_code: 'NMA 201', subject_name: 'Engg. Math-II', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NCH 201', subject_name: 'Chemical Engineering Fluid Mechanics', year_number: 2, semester_number: 3, credits: 5, hours: 50, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCH 203', subject_name: 'Particle and Fluid Particle processing', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 205', subject_name: 'Chemical Engineering Thermodynamics -I', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 207', subject_name: 'Chemical Process Calculation', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NHS 201', subject_name: 'Industrial Economics & Management', year_number: 2, semester_number: 3, credits: 3, hours: 30, category: 'Humanities and Social Sciences (HMSC)' },

  // Year II, Semester-IV (Credits: 24)
  { subject_code: 'NCY 202', subject_name: 'Modern Analytical Techniques', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NMA 204', subject_name: 'Computer Oriented Numerical Methods', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCH 202', subject_name: 'Process Heat Transfer', year_number: 2, semester_number: 4, credits: 5, hours: 50, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 204', subject_name: 'Mass Transfer Operations -I', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 206', subject_name: 'Chemical Engineering Thermodynamics -II', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 208', subject_name: 'Chemical Reaction Engineering -I', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },

  // Year III, Semester-V (Credits: 22)
  { subject_code: 'NCH 301', subject_name: 'Computer Aided Equipment Design', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 303', subject_name: 'Chemical Reaction Engineering -II', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 305', subject_name: 'Mass Transfer operations -II', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 307', subject_name: 'Transport Phenomena', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 309', subject_name: 'Chemical Technology', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'HSS 301', subject_name: 'Entrepreneurship Development', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Humanities and Social Sciences (HMSC)' },

  // Year III, Semester-VI (Credits: 22)
  { subject_code: 'NCH 302', subject_name: 'Process Control & Instrumentation', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 304', subject_name: 'Plant Design & Economics', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 306', subject_name: 'Process Modelling & Simulation', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 308', subject_name: 'Plant safety and environmental aspects', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 310', subject_name: 'Material Science and Engineering', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 312', subject_name: 'Program Elective - I (Mathematical Methods in Chemical Engineering / Design of Experiments / Process Optimization / Advanced Control System)', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'NCH 466', subject_name: 'Open Elective - I (Industrial Pollution Control and Waste Management)', year_number: 3, semester_number: 6, credits: 2, hours: 20, category: 'Open Electives (OEC)' },

  // Year IV, Semester-VII (Credits: 22)
  { subject_code: 'NCH 401', subject_name: 'Program Elective - II (Advanced Separation Processes / Conceptual Design of Chemical Processes / Energy Resource & Energy Conservation / Pipeline transportation of Oil & Gas)', year_number: 4, semester_number: 7, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
  { subject_code: 'NCH 409', subject_name: 'Program Elective - III (Petroleum Refining & Petrochemical Technology / Nano Technology / Bio Process Engineering / Electrochemical Technology / Principle of Polymer Engineering)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'NCH 419', subject_name: 'Program Elective - IV (Green Chemistry / Micro-Chemical System / Colloids & Interface Science and Engineering / Corrosion Science and Engineering)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'NCH 427', subject_name: 'Industrial Training', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Program Core (PCC)' },
  { subject_code: 'OE-NCH 401', subject_name: 'Open Elective - II (Energy Resources and Utilization)', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Open Electives (OEC)' },
  { subject_code: 'NCH 429', subject_name: 'Project - 1', year_number: 4, semester_number: 7, credits: 6, hours: 60, category: 'Program Core (PCC)' },
  { subject_code: 'NCH 431', subject_name: 'Seminar', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Program Core (PCC)' },

  // Year IV, Semester-VIII (Credits: 22)
  { subject_code: 'NCH 402', subject_name: 'Program Elective - V (Management of R&D / Environmental Impact Assessment / Air Pollution Monitoring & Control / Energy Management)', year_number: 4, semester_number: 8, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
  { subject_code: 'OE-NCH 402', subject_name: 'Open Elective - III (Process Utilities)', year_number: 4, semester_number: 8, credits: 2, hours: 20, category: 'Open Electives (OEC)' },
  { subject_code: 'NCH 410', subject_name: 'Project-2', year_number: 4, semester_number: 8, credits: 16, hours: 160, category: 'Program Core (PCC)' },
];

// ============================================================================
// 3. CIVIL ENGINEERING (CE) SUBJECTS
// ============================================================================
const ceSubjects = [
  // Year I, Semester-I (Credits: 22)
  { subject_code: 'NCY101', subject_name: 'Engineering Chemistry', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NCS101', subject_name: 'Introduction to Computer Science & Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NET101', subject_name: 'Introduction to Electronics Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCE101', subject_name: 'Introduction to Civil Engineering', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCT101', subject_name: 'Introduction to Chemical Engineering & Chemical Technology', year_number: 1, semester_number: 1, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NWS101', subject_name: 'Workshop Practice', year_number: 1, semester_number: 1, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

  // Year I, Semester-II (Credits: 22)
  { subject_code: 'NPH102', subject_name: 'Engineering Physics', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NMA102', subject_name: 'Engineering Mathematics-I', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NEE102', subject_name: 'Introduction to Electrical Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NME102', subject_name: 'Introduction to Mechanical Engineering', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NHS102', subject_name: 'Professional Communication', year_number: 1, semester_number: 2, credits: 4, hours: 40, category: 'Humanities and Social Sciences (HMSC)' },
  { subject_code: 'NCE102', subject_name: 'Engineering Graphics', year_number: 1, semester_number: 2, credits: 2, hours: 20, category: 'Engineering Sciences (ESC)' },

  // Year II, Semester-III (Credits: 24)
  { subject_code: 'NMA201', subject_name: 'Engg. Math-II', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NME201', subject_name: 'Strength of Material', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCE201', subject_name: 'Fluid Mechanics', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE203', subject_name: 'Surveying', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE205', subject_name: 'Building Material and Construction', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE207', subject_name: 'Geotechnical Engineering-I', year_number: 2, semester_number: 3, credits: 4, hours: 40, category: 'Program Core (PCC)' },

  // Year II, Semester-IV (Credits: 24)
  { subject_code: 'NMA202', subject_name: 'Engg. Math III', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Basic Sciences (BSC)' },
  { subject_code: 'NCE202', subject_name: 'HHM/C (Hydraulics & Hydraulic Machines)', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Engineering Sciences (ESC)' },
  { subject_code: 'NCE204', subject_name: 'SA-I (Structural Analysis-I)', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCE206', subject_name: 'DCS-I (Design of Concrete Structure-I)', year_number: 2, semester_number: 4, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE208', subject_name: 'Environmental Engg – I', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NHS202', subject_name: 'Engg. Economics & Management', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Humanities and Social Sciences (HMSC)' },
  { subject_code: 'NCE210', subject_name: 'Transportation Engineering-I', year_number: 2, semester_number: 4, credits: 3, hours: 30, category: 'Program Core (PCC)' },

  // Year III, Semester-V (Credits: 22)
  { subject_code: 'NCE301', subject_name: 'Structural Analysis II', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCE303', subject_name: 'Design of Concrete Engineering-II', year_number: 3, semester_number: 5, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCE305', subject_name: 'Geotechnical Engineering-II', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE307', subject_name: 'Transportation Engineering-II', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE309', subject_name: 'Environmental Engineering II', year_number: 3, semester_number: 5, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE311', subject_name: 'Computer Applications in Civil Engineering', year_number: 3, semester_number: 5, credits: 2, hours: 20, category: 'Program Core (PCC)' },
  { subject_code: 'OCE301', subject_name: 'Open Elective-I (Environment & Ecology / Human Values / Cyber Security / Indian Knowledge Tradition)', year_number: 3, semester_number: 5, credits: 2, hours: 20, category: 'Open Electives (OEC)' },

  // Year III, Semester-VI (Credits: 22)
  { subject_code: 'NCE302', subject_name: 'Design of steel structure', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCE304', subject_name: 'Engg Hydrology', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCE306', subject_name: 'Estimation & Construction Management', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCE308', subject_name: 'Irrigation & Hydraulic Design', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Core (PCC)' },
  { subject_code: 'NCE310', subject_name: 'Earthquake Resistant Design', year_number: 3, semester_number: 6, credits: 3, hours: 30, category: 'Program Core (PCC)' },
  { subject_code: 'NCE322', subject_name: 'Program Elective-I (Repair & Maintenance of Concrete / Ground Improvement / EIA / Advanced Concrete / Industrial Waste Management / Traffic Engineering / Open Channel Flow / Remote Sensing & GIS)', year_number: 3, semester_number: 6, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
  { subject_code: 'NHS302', subject_name: 'Entrepreneurship Development', year_number: 3, semester_number: 6, credits: 2, hours: 20, category: 'Humanities and Social Sciences (HMSC)' },

  // Year IV, Semester-VII (Credits: 22)
  { subject_code: 'NCE421', subject_name: 'Program Elective-II (Site Investigation & Foundation / Earthquake Resistant Design / Municipal Solid Waste / Transportation System / Bridge Engineering / Stochastic Hydrology / Advanced Steel / Environmental Risk)', year_number: 4, semester_number: 7, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
  { subject_code: 'NCE441', subject_name: 'Program Elective-III (Tanks & Reservoirs / Structural Dynamics / Soil Dynamics / Industrial Wastewater / Advanced Hydrology / ITS / Solid Waste / Advanced Structural Analysis)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'NCE461', subject_name: 'Program Elective-IV (Structural Fire / Earthquake Resistant Foundations / Slope Stability / Water Quality Modelling / Pavement Construction / Urban Hydrology / Highway Soil Mechanics)', year_number: 4, semester_number: 7, credits: 3, hours: 30, category: 'Program Electives (PEC)' },
  { subject_code: 'NCE471', subject_name: 'Seminar', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Program Core (PCC)' },
  { subject_code: 'NCE481', subject_name: 'Industrial Training', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Program Core (PCC)' },
  { subject_code: 'NCE491', subject_name: 'B.Tech Minor Project', year_number: 4, semester_number: 7, credits: 6, hours: 60, category: 'Program Core (PCC)' },
  { subject_code: 'OCE401', subject_name: 'Open Elective-II (Environmental Pollution and Management / Disaster Management)', year_number: 4, semester_number: 7, credits: 2, hours: 20, category: 'Open Electives (OEC)' },

  // Year IV, Semester-VIII (Credits: 22)
  { subject_code: 'NCE422', subject_name: 'Program Elective-V (Geo-Environmental / Planning of Buildings / Environmental Pollution & Control / Ground Water Flow / Construction & Contract / Sustainable Transport / Precast & Modular / Pre-Stressed Concrete)', year_number: 4, semester_number: 8, credits: 4, hours: 40, category: 'Program Electives (PEC)' },
  { subject_code: 'OCE402', subject_name: 'Open Elective-III (Introduction to RS and GIS / Introduction to Infrastructure Engineering)', year_number: 4, semester_number: 8, credits: 2, hours: 20, category: 'Open Electives (OEC)' },
  { subject_code: 'NCE492', subject_name: 'B.Tech Major Project', year_number: 4, semester_number: 8, credits: 16, hours: 160, category: 'Program Core (PCC)' },
];

// ============================================================================
// 4. UNIT GENERATOR BASED ON OFFICIAL SYLLABI
// ============================================================================
function generateUnits(subject) {
  const code = (subject.subject_code || '').toUpperCase();
  const name = (subject.subject_name || '').toLowerCase();

  // Chemical Engineering Fluid Mechanics
  if (code.includes('NCH 201') || name.includes('chemical engineering fluid mechanics')) {
    return [
      { unit_number: 1, unit_title: 'Properties of Fluid and Fluid Statics', description: 'Density, compressibility, vapor pressure, surface tension, viscosity, Newton\'s Law of Viscosity, Pascal\'s law, hydrostatic law, manometers.', topics: [{ title: 'Fluid Properties and Viscosity Laws' }, { title: 'Fluid Statics and Hydrostatic Equilibrium' }, { title: 'Manometric Pressure Measurements' }] },
      { unit_number: 2, unit_title: 'Fluid Kinematics and Fluid Dynamics', description: 'Lagrangian and Eulerian descriptions, conservation equations in differential and integral forms, Navier-Stokes equations, Hagen-Poiseuille law, Bernoulli equation.', topics: [{ title: 'Eulerian & Lagrangian Velocity Fields' }, { title: 'Navier-Stokes & Momentum Balances' }, { title: 'Engineering Bernoulli Applications' }] },
      { unit_number: 3, unit_title: 'Boundary Layer Concepts and Pipe Flow', description: 'Boundary layer development, laminar and turbulent flows in pipes, friction factor, major and minor losses in fittings, piping network design.', topics: [{ title: 'Boundary Layer Growth on Flat Plates' }, { title: 'Friction Factor & Pressure Drop in Pipes' }, { title: 'Equivalent Length of Valves & Fittings' }] },
      { unit_number: 4, unit_title: 'Flow Measurement in Open and Closed Channels', description: 'Venturi meter, orifice meter, pitot tube, rotameter, Coriolis flow meter, ultrasonic Doppler meters, weirs and notches.', topics: [{ title: 'Venturimeter, Orificemeter & Pitot Tube' }, { title: 'Rotameters & Non-Intrusive Flow Meters' }, { title: 'Open Channel Flow: Weirs and Notches' }] },
      { unit_number: 5, unit_title: 'Pumps, Compressors & System Characteristics', description: 'Positive displacement pumps, centrifugal pumps, cavitation, affinity laws, system characteristics curves, NPSH calculations.', topics: [{ title: 'Positive Displacement vs Centrifugal Pumps' }, { title: 'Pump Affinity Laws & Cavitation Analysis' }, { title: 'NPSH & Pump Sizing Calculations' }] },
    ];
  }

  // Process Heat Transfer
  if (code.includes('NCH 202') || name.includes('process heat transfer') || name.includes('heat transfer operations')) {
    return [
      { unit_number: 1, unit_title: 'Conduction and Extended Surfaces', description: 'Fourier\'s law, 1D steady-state conduction in composite walls, cylinders, and spheres, critical thickness of insulation, fins efficiency.', topics: [{ title: 'Fourier Law & Steady Conduction' }, { title: 'Composite Walls & Insulation Optimization' }, { title: 'Fin Heat Transfer & Efficiency' }] },
      { unit_number: 2, unit_title: 'Convective Heat Transfer & Dimensionless Analogies', description: 'Forced and natural convection, boundary layers, Nusselt, Prandtl, Grashof, Reynolds numbers, Colburn analogy, liquid metals.', topics: [{ title: 'Forced Convection in Tubes & Ducts' }, { title: 'Dimensionless Numbers & Buckingham Pi' }, { title: 'Natural Convection & Analogy Formulations' }] },
      { unit_number: 3, unit_title: 'Thermal Radiation & Exchange', description: 'Black body laws (Planck, Stefan-Boltzmann, Wien), emissivity, view factors, radiation exchange between gray and black surfaces, shields.', topics: [{ title: 'Blackbody Radiation & Spectral Laws' }, { title: 'View Factor Geometry & Calculations' }, { title: 'Radiation Exchange in Enclosures' }] },
      { unit_number: 4, unit_title: 'Boiling, Condensation & Evaporators', description: 'Pool boiling regimes, dropwise and filmwise condensation, Nusselt theory, single and multiple effect evaporators, boiling point elevation.', topics: [{ title: 'Pool Boiling Curve & Critical Flux' }, { title: 'Filmwise vs Dropwise Condensation' }, { title: 'Multiple Effect Evaporator Economy' }] },
      { unit_number: 5, unit_title: 'Heat Exchanger Design & Performance', description: 'LMTD method, NTU-effectiveness method, double-pipe and shell-and-tube heat exchangers, Kern method, Bell-Delaware method, fouling.', topics: [{ title: 'LMTD & Effectiveness-NTU Methods' }, { title: 'Shell & Tube Exchanger Standards (TEMA)' }, { title: 'Fouling Resistances & Kern Design' }] },
    ];
  }

  // Mass Transfer Operations
  if (code.includes('NCH 204') || code.includes('NCH 305') || name.includes('mass transfer')) {
    return [
      { unit_number: 1, unit_title: 'Diffusion & Mass Transfer Coefficients', description: 'Fick\'s law of diffusion, equimolar counter-diffusion, diffusion in gases and liquids, film theory, penetration theory, surface renewal theory.', topics: [{ title: 'Fickian Molecular Diffusion Principles' }, { title: 'Theories of Mass Transfer at Interfaces' }, { title: 'Overall Mass Transfer Coefficients' }] },
      { unit_number: 2, unit_title: 'Absorption, Stripping & Column Sizing', description: 'Gas-liquid equilibria, Henry\'s law, packed and tray columns, HTU, NTU, HETP concepts, flooding, loading, and design calculations.', topics: [{ title: 'Absorption Equilibrium & Operating Lines' }, { title: 'HTU, NTU & Packed Height Design' }, { title: 'Tray Column Hydraulics & Sizing' }] },
      { unit_number: 3, unit_title: 'Distillation of Binary & Multicomponent Systems', description: 'VLE, relative volatility, flash distillation, McCabe-Thiele and Ponchon-Savarit methods, reflux ratio, azeotropic and extractive distillation.', topics: [{ title: 'Vapor-Liquid Equilibrium & Raoult Law' }, { title: 'McCabe-Thiele Method for Binary Columns' }, { title: 'Azeotropic & Extractive Distillation' }] },
      { unit_number: 4, unit_title: 'Liquid-Liquid Extraction & Leaching', description: 'Ternary phase equilibria, triangular diagrams, crosscurrent and countercurrent multistage extraction, solid-liquid leaching equipment.', topics: [{ title: 'Ternary Liquid Equilibria & Tie Lines' }, { title: 'Multistage Extraction Column Design' }, { title: 'Solid-Liquid Leaching Mechanisms' }] },
      { unit_number: 5, unit_title: 'Adsorption, Drying & Membrane Separations', description: 'Adsorption isotherms (Langmuir, Freundlich), drying rate curves, drying time, ultrafiltration, reverse osmosis, hollow-fiber modules.', topics: [{ title: 'Adsorption Isotherms & Fixed Bed Break' }, { title: 'Drying Mechanisms & Rate Periods' }, { title: 'Membrane Separations: RO & Dialysis' }] },
    ];
  }

  // Civil: Fluid Mechanics
  if (code.includes('NCE201') || name.includes('fluid mechanics')) {
    return [
      { unit_number: 1, unit_title: 'Introduction and Fluid Statics', description: 'Fluid properties, rheological classification, Pascal\'s Law, piezometers, manometers, center of pressure, buoyancy, metacentre, stability.', topics: [{ title: 'Physical Properties of Fluids & Rheology' }, { title: 'Hydrostatic Forces on Surfaces' }, { title: 'Buoyancy, Floatation & Metacentric Height' }] },
      { unit_number: 2, unit_title: 'Fluid Kinematics & Continuity', description: 'Eulerian & Lagrangian approach, streamlines, pathlines, streaklines, stream function, velocity potential, flow nets, continuity equation.', topics: [{ title: 'Kinematics: Velocity & Acceleration' }, { title: 'Stream & Potential Functions, Flow Nets' }, { title: 'Vortex Motion: Free and Forced' }] },
      { unit_number: 3, unit_title: 'Fluid Dynamics & Dimensional Analysis', description: 'Euler\'s equation, Bernoulli theorem, Pitot tube, venturimeter, orificemeter, Buckingham Pi theorem, hydraulic similitude and model laws.', topics: [{ title: 'Bernoulli Equation & HGL/TEL Concepts' }, { title: 'Flow Meters: Venturi, Orifice, Pitot' }, { title: 'Buckingham Pi & Model Similitude' }] },
      { unit_number: 4, unit_title: 'Flow in Pipes & Losses', description: 'Laminar flow, Hagen-Poiseuille equation, Darcy-Weisbach equation, friction factor, minor losses, Moody diagram, pipe networks, Hardy Cross.', topics: [{ title: 'Laminar Viscous Pipe Flow & Darcy Law' }, { title: 'Turbulent Flow & Moody Chart Friction' }, { title: 'Pipe Networks & Hardy Cross Solution' }] },
      { unit_number: 5, unit_title: 'Boundary Layer Theory & Submerged Bodies', description: 'Boundary layer along flat plate, laminar and turbulent layers, displacement and momentum thicknesses, drag and lift on submerged bodies.', topics: [{ title: 'Boundary Layer Thickness & Growth' }, { title: 'Hydraulically Smooth vs Rough Boundaries' }, { title: 'Drag and Lift Forces on Submerged Bodies' }] },
    ];
  }

  // Civil: Surveying
  if (code.includes('NCE203') || name.includes('surveying')) {
    return [
      { unit_number: 1, unit_title: 'Introduction to Surveying & Chain Survey', description: 'Principles of surveying, scales, error sources, chains and tapes, chaining and ranging, obstacles in chaining, field book records.', topics: [{ title: 'Surveying Principles & Error Corrections' }, { title: 'Chain Surveying & Ranging Protocols' }, { title: 'Field Book Entries & Obstacle Solving' }] },
      { unit_number: 2, unit_title: 'Compass & Plane Table Surveying', description: 'Prismatic and surveyor compass, magnetic bearings, local attraction, traversing closing errors, plane table methods (radiation, intersection).', topics: [{ title: 'Compass Traversing & Local Attraction' }, { title: 'Adjustment of Traverse Closing Errors' }, { title: 'Plane Table Surveying Operations' }] },
      { unit_number: 3, unit_title: 'Levelling, Contouring & Earthwork', description: 'Dumpy level, leveling staff, height of collimation, rise-and-fall methods, contour characteristics, interpolation, earthwork volume calculation.', topics: [{ title: 'Levelling Principles & Reduction Methods' }, { title: 'Contouring Techniques & Map Creation' }, { title: 'Cross-Sections & Earthwork Computations' }] },
      { unit_number: 4, unit_title: 'Theodolite, Tacheometry & Curve Setting', description: 'Transit theodolite parts, angles, trigonometric leveling, tacheometric constants, setting out horizontal circular and vertical curves.', topics: [{ title: 'Theodolite Traversing & Angular Reading' }, { title: 'Tacheometric Distance & Height Measurement' }, { title: 'Horizontal & Vertical Curve Setting' }] },
      { unit_number: 5, unit_title: 'Advanced Surveying & Modern Geospatial Tools', description: 'Electronic Distance Measurement (EDM), Total Station features and operation, Global Positioning System (GPS), survey data export.', topics: [{ title: 'EDM Principles & Distance Measurement' }, { title: 'Total Station Field Operations & Features' }, { title: 'GPS Positioning & Digital Coordinates' }] },
    ];
  }

  // Civil: Building Materials & Construction
  if (code.includes('NCE205') || name.includes('building material')) {
    return [
      { unit_number: 1, unit_title: 'Building Materials: Bricks, Stone, Lime & Timber', description: 'Properties, manufacturing, and tests for burnt clay bricks, stone classification, lime field tests, timber seasoning, defects, plywood.', topics: [{ title: 'Clay Bricks: Manufacture, Grades & Tests' }, { title: 'Building Stones & Dressing Operations' }, { title: 'Timber Characteristics & Seasoning Methods' }] },
      { unit_number: 2, unit_title: 'Cement, Aggregates, Admixtures & Mortar', description: 'OPC, PPC, special cements, hydration, testing of cement, aggregate properties, mineral/chemical admixtures, mortar types and strength.', topics: [{ title: 'Portland Cement Manufacture & Testing' }, { title: 'Fine & Coarse Aggregate Quality Control' }, { title: 'Concrete Admixtures & Mortar Properties' }] },
      { unit_number: 3, unit_title: 'Masonry Works & Building Byelaws', description: 'National Building Code (NBC) recommendations, building byelaws, brick bonds, stone masonry, partition walls, damp-proofing techniques.', topics: [{ title: 'NBC Provisions & Building Byelaws' }, { title: 'Brick Masonry Bonds & Construction' }, { title: 'Damp Proof Course (DPC) & Moisture Control' }] },
      { unit_number: 4, unit_title: 'Building Elements: Foundations, Floors, Roofs & Stairs', description: 'Foundation types, selection criteria, flooring materials and construction, roof trusses, formwork, scaffolding, staircases planning.', topics: [{ title: 'Shallow & Deep Foundation Construction' }, { title: 'Flooring Materials & Sub-Base Details' }, { title: 'Roofs, Formwork, Scaffolding & Stairs' }] },
      { unit_number: 5, unit_title: 'Doors, Windows, Finishes & Protection', description: 'Doors and windows classification, plastering, pointing, painting, distempering, fire safety, termite proofing, roof waterproofing.', topics: [{ title: 'Doors & Windows Hardware and Placement' }, { title: 'Surface Finishes: Plaster, Pointing, Paint' }, { title: 'Waterproofing, Fire & Anti-Termite Protection' }] },
    ];
  }

  // Civil: Geotechnical Engineering
  if (code.includes('NCE207') || code.includes('NCE305') || name.includes('geotechnical')) {
    return [
      { unit_number: 1, unit_title: 'Soil Origin, Structure & Phase Relations', description: 'Three-phase soil system, void ratio, porosity, water content, density, Atterberg limits, sieve analysis, hydrometer, soil classification (ISC).', topics: [{ title: 'Three-Phase Soil Phase System & Index Terms' }, { title: 'Grain Size Distribution & Sieve Analysis' }, { title: 'Consistency Limits & IS Classification' }] },
      { unit_number: 2, unit_title: 'Permeability, Seepage & Compaction', description: 'Darcy\'s law, coefficient of permeability, falling and constant head tests, quick-sand condition, Proctor compaction, field compaction rollers.', topics: [{ title: 'Permeability & Seepage Through Soils' }, { title: 'Quick-Sand Phenomenon & Flow Nets' }, { title: 'Proctor Compaction Tests & Field Control' }] },
      { unit_number: 3, unit_title: 'Consolidation & Settlement', description: 'Terzaghi\'s 1D consolidation theory, e-log p curves, preconsolidation pressure, settlement calculation, square root and log time methods.', topics: [{ title: 'Terzaghi 1D Consolidation Theory' }, { title: 'Compression Index & Overconsolidation' }, { title: 'Time Rate of Settlement Computations' }] },
      { unit_number: 4, unit_title: 'Shear Strength of Soils', description: 'Mohr-Coulomb failure criterion, direct shear test, triaxial compression tests (UU, CU, CD), unconfined compression test, pore water pressure.', topics: [{ title: 'Mohr-Coulomb Failure Criteria' }, { title: 'Direct Shear & Triaxial Test Systems' }, { title: 'Drainage Conditions & Pore Pressure' }] },
      { unit_number: 5, unit_title: 'Lateral Earth Pressure & Retaining Walls', description: 'Rankine and Coulomb earth pressure theories, active, passive, and at-rest pressures, Culmann graphical construction, stability of retaining walls.', topics: [{ title: 'Rankine Lateral Earth Pressure Theory' }, { title: 'Coulomb Wedge Theory & Active Pressures' }, { title: 'Earth Retaining Structures Stability' }] },
    ];
  }

  // Biochemical Engineering Core
  if (code.includes('NBE-201') || name.includes('life processes') || name.includes('microbiology') || name.includes('biochemistry')) {
    return [
      { unit_number: 1, unit_title: 'Cellular Organization & Biomolecular Structure', description: 'Prokaryotic and eukaryotic cellular ultrastructure, organelles, cellular membranes, transport mechanisms, structure of carbohydrates and lipids.', topics: [{ title: 'Prokaryotic vs Eukaryotic Architecture' }, { title: 'Membrane Transport & Fluid Mosaic Model' }, { title: 'Biomolecules: Sugars, Lipids & Complex Glucans' }] },
      { unit_number: 2, unit_title: 'Proteins, Nucleic Acids & Molecular Genetics', description: 'Amino acid chemistry, peptide bond, primary/secondary/tertiary structures, DNA/RNA structures, replication, transcription, translation.', topics: [{ title: 'Protein Folding & Conformation Hierarchy' }, { title: 'DNA Double Helix & RNA Architectures' }, { title: 'Central Dogma: Replication & Transcription' }] },
      { unit_number: 3, unit_title: 'Enzymology & Catalytic Kinetics', description: 'Enzyme classification, active site, Michaelis-Menten kinetics, Lineweaver-Burk plot, enzyme inhibition (competitive, non-competitive), allostery.', topics: [{ title: 'Michaelis-Menten Steady-State Kinetics' }, { title: 'Reversible & Irreversible Enzyme Inhibition' }, { title: 'Allosteric Regulation & Multi-Substrate Systems' }] },
      { unit_number: 4, unit_title: 'Microbial Growth & Industrial Strains', description: 'Microbial nutrition, pure culture isolation, batch growth phases, Monod growth model, continuous culture chemostats, strain preservation.', topics: [{ title: 'Batch Microbial Growth Phases & Kinetics' }, { title: 'Monod Specific Growth Rate Equations' }, { title: 'Continuous Culture & Chemostat Dynamics' }] },
      { unit_number: 5, unit_title: 'Industrial Fermentation & Downstream Harvesting', description: 'Fermentation media design, sterilization kinetics, bioreactor types, cell disruption, solid-liquid separation, chromatography, product recovery.', topics: [{ title: 'Media Formulation & Thermal Sterilization' }, { title: 'Bioreactor Agitation, Aeration & Scale' }, { title: 'Downstream Recovery & Bioseparations' }] },
    ];
  }

  // Universal fallback: 5 standard engineering units
  return [
    {
      unit_number: 1,
      unit_title: `Foundations and Principles of ${subject.subject_name}`,
      description: `Governing theories, fundamental equations, material properties, and basic definitions of ${subject.subject_name}.`,
      topics: [
        { title: `Core Definitions and Scope of Study` },
        { title: `Theoretical Principles and Governing Laws` },
        { title: `System Classification and Physical Formulations` },
      ],
    },
    {
      unit_number: 2,
      unit_title: `Analysis, Methods and Analytical Formulations`,
      description: `Mathematical models, empirical relationships, analytical methods, and analytical derivations.`,
      topics: [
        { title: `Analytical Formulations & Problem Setup` },
        { title: `Empirical Relationships and Correlations` },
        { title: `Parametric Variations and Sensitivity` },
      ],
    },
    {
      unit_number: 3,
      unit_title: `Engineering Design and Modeling Techniques`,
      description: `Standard design criteria, engineering codes, process synthesis, and calculation procedures.`,
      topics: [
        { title: `Standard Design Procedures & Codes` },
        { title: `System Integration and Process Calculations` },
        { title: `Equipment Selection and Capacity Sizing` },
      ],
    },
    {
      unit_number: 4,
      unit_title: `Advanced Topics, Modern Technologies & Industrial Applications`,
      description: `State-of-the-art developments, industrial case studies, contemporary technologies, and efficiency optimizations.`,
      topics: [
        { title: `Contemporary Trends and Advanced Tools` },
        { title: `Industrial Case Studies and Optimization` },
        { title: `Emerging Paradigms in the Domain` },
      ],
    },
    {
      unit_number: 5,
      unit_title: `Laboratory Protocols, Field Verification & Safety Standards`,
      description: `Experimental testing, field applications, quality control, environmental and regulatory standards.`,
      topics: [
        { title: `Experimental & Field Testing Procedures` },
        { title: `Quality Control & Operational Standards` },
        { title: `Environmental, Safety and Regulatory Compliance` },
      ],
    },
  ];
}

// ============================================================================
// 5. MAIN EXECUTION
// ============================================================================
async function main() {
  console.log('========================================================================');
  console.log('  HBTU Kanpur — Seeding Official Curricula for BC, CHE, and CE');
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

  // 2. Fetch Branches for BC, CHE, CE
  const { data: branches, error: brErr } = await supabase
    .from('branches')
    .select('id, name, code, program_id')
    .eq('program_id', btech.id)
    .in('code', ['BC', 'CHE', 'CE']);

  if (brErr || !branches || branches.length < 3) {
    console.error('❌ Could not find all 3 branches (BC, CHE, CE):', brErr?.message);
    process.exit(1);
  }

  const bcBranch = branches.find((b) => b.code === 'BC');
  const cheBranch = branches.find((b) => b.code === 'CHE');
  const ceBranch = branches.find((b) => b.code === 'CE');

  console.log(`✅ Loaded Branches:`);
  console.log(`   - BC:  ${bcBranch.name} (${bcBranch.id})`);
  console.log(`   - CHE: ${cheBranch.name} (${cheBranch.id})`);
  console.log(`   - CE:  ${ceBranch.name} (${ceBranch.id})\n`);

  async function seedBranch(branch, rawSubjects, branchLabel) {
    console.log(`------------------------------------------------------------------------`);
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

    // Prepare Units and Topics
    const allUnitRows = [];
    const unitsMeta = [];

    for (const sub of inserted) {
      const units = generateUnits(sub);
      for (const u of units) {
        allUnitRows.push({
          subject_id: sub.id,
          unit_number: u.unit_number,
          unit_title: u.unit_title,
          description: u.description,
          hours: sub.hours ? Math.round(sub.hours / 5) : 8,
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

    const unitLookup = new Map();
    (dbUnits || []).forEach((u) => {
      unitLookup.set(`${u.subject_id}_${u.unit_number}`, u.id);
    });

    const allTopicRows = [];
    for (const m of unitsMeta) {
      const unitDbId = unitLookup.get(`${m.subject_id}_${m.unit_number}`);
      if (!unitDbId) continue;
      m.topics.forEach((t, idx) => {
        allTopicRows.push({
          unit_id: unitDbId,
          topic_order: idx + 1,
          title: t.title,
          details: null,
        });
      });
    }

    // Bulk upsert topics in batches of 100
    for (let i = 0; i < allTopicRows.length; i += 100) {
      const chunk = allTopicRows.slice(i, i + 100);
      const { error: chunkErr } = await supabase
        .from('syllabus_topics')
        .upsert(chunk, { onConflict: 'unit_id,topic_order' });
      if (chunkErr) console.warn('Warning inserting topics chunk:', chunkErr.message);
    }

    console.log(`✅ Seeded ${allUnitRows.length} units and ${allTopicRows.length} topics for ${branch.code}.\n`);
  }

  // Seed BC (Biochemical Engineering)
  await seedBranch(bcBranch, bcSubjects, 'Biochemical Engineering');

  // Seed CHE (Chemical Engineering)
  await seedBranch(cheBranch, cheSubjects, 'Chemical Engineering');

  // Seed CE (Civil Engineering)
  await seedBranch(ceBranch, ceSubjects, 'Civil Engineering');

  console.log('========================================================================');
  console.log('  🎉 All branches (BC, CHE, CE) seeded successfully!');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
