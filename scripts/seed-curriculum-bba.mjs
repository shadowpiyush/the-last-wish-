/**
 * Seed Official BBA Curriculum & Syllabus
 * Bachelor of Business Administration (BBA)
 * Department of Management Studies, School of Entrepreneurship & Management
 * Harcourt Butler Technical University, Kanpur, India
 * Academic Session: 2024-25
 * 
 * Run: node --env-file=.env.local scripts/seed-curriculum-bba.mjs
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

export const bbaSubjects = [
  // ============================================================================
  // FIRST YEAR — SEMESTER I (Academic Session 2024-25)
  // ============================================================================
  {
    subject_code: 'NBA 101',
    subject_name: 'Principles of Management',
    year_number: 1,
    semester_number: 1,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Management',
        description: 'Definition, nature, and significance of management, principles of management, management and administration, levels of management, role of managers and managerial skills; Evolution of management thought: Classical, Behavioral, Quantitative, Systems, Contingency and Modern approaches; Management as a science and an art; Functions of management.',
        topics: [
          { title: 'Nature, Scope and Significance of Management' },
          { title: 'Evolution of Management Thought (Classical, Behavioral, Modern)' },
          { title: 'Managerial Roles, Skills and Administrative Hierarchy' },
          { title: 'Core Functions of Management: POLC Framework' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Planning, Organizing and Staffing',
        description: 'Nature, Importance and Purpose of planning; Strategic, tactical, and operational plans; Planning process; Decision making models and steps; Organizational structure: Functional, divisional, matrix; Authority, delegation, centralization vs decentralization, span of control; MBO and MBE; Staffing process and recruitment.',
        topics: [
          { title: 'Planning Process, Types of Plans & Techniques' },
          { title: 'Decision Making Models, Steps and Decision Tools' },
          { title: 'Organizational Structures: Functional, Divisional & Matrix' },
          { title: 'Delegation, Span of Control, MBO & Staffing Process' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Leading, Directing and Controlling',
        description: 'Directing meaning and nature; Leadership theories (trait, behavioral, contingency, transformational, level-5); Motivation theories (Maslow, Herzberg, McGregor X & Y, Hawthorne); Communication in management; Group dynamics; Controlling process, systems, and performance measurement.',
        topics: [
          { title: 'Leadership Theories (Trait, Contingency, Transformational)' },
          { title: 'Motivation Theories (Maslow, Herzberg, McGregor)' },
          { title: 'Managerial Communication, Team Building & Dynamics' },
          { title: 'Control Systems, Process, Essentials & Performance Metrics' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Strategic Management, Ethics and Social Responsibility',
        description: 'Overview of strategic management, SWOT analysis and strategy formulation, implementation and evaluation. Ethical issues in management, Corporate Social Responsibility (CSR), and Sustainable management practices.',
        topics: [
          { title: 'Strategic Management Overview & SWOT Analysis' },
          { title: 'Strategy Formulation, Implementation and Evaluation' },
          { title: 'Ethical Issues in Management & Corporate Governance' },
          { title: 'Corporate Social Responsibility (CSR) & Sustainability' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 103',
    subject_name: 'Business Economics',
    year_number: 1,
    semester_number: 1,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Fundamentals and Basic Elements of Microeconomics',
        description: 'Economic problem: Scarcity and choice, Positive and normative economics. Central problems of economics. Demand schedule, determinants, law of demand, elasticity of demand. Supply schedule, law of supply, elasticity of supply. Equilibrium price determination.',
        topics: [
          { title: 'Scarcity, Choice and Central Problems of Economy' },
          { title: 'Demand Analysis, Law of Demand & Elasticity' },
          { title: 'Supply Schedule, Law of Supply & Price Elasticity' },
          { title: 'Market Equilibrium & Shifts in Demand-Supply Curves' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Producer and Consumer Behavior',
        description: 'Theory of production, production function, law of variable proportions, returns to scale, producer equilibrium. Theory of cost: Short run and long run average, marginal cost curves. Utility approach: Law of diminishing marginal utility, indifference curves and consumer equilibrium.',
        topics: [
          { title: 'Production Function & Law of Variable Proportions' },
          { title: 'Short-Run and Long-Run Cost Curves & Returns to Scale' },
          { title: 'Cardinal Utility Analysis & Diminishing Marginal Utility' },
          { title: 'Ordinal Utility: Indifference Curves & Consumer Equilibrium' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Analysis of Market Structures',
        description: 'Concept of market and main forms of market. Price and output determination under perfect competition, monopoly, monopolistic competition, and oligopoly.',
        topics: [
          { title: 'Classification and Concept of Markets' },
          { title: 'Price & Output Determination under Perfect Competition' },
          { title: 'Monopoly Pricing and Output Decisions' },
          { title: 'Monopolistic Competition & Oligopolistic Interdependence' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'National Income and Indian Economy Challenges',
        description: 'Circular flow of income, concepts of GDP, GNP, NDP, NNP at market price and factor cost. National income calculation methods. Introduction to Indian economy pre- and post-independence, poverty, human capital, sustainable development.',
        topics: [
          { title: 'Circular Flow of Income & National Income Aggregates' },
          { title: 'Methods of Calculating National Income' },
          { title: 'Indian Economy Pre- & Post-Independence' },
          { title: 'Contemporary Challenges: Poverty, Capital Formation & Trade' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 105',
    subject_name: 'Financial Accounting',
    year_number: 1,
    semester_number: 1,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Accounting, System and Process',
        description: 'Meaning, need for accounting and AIS, qualitative aspects, Indian and international accounting standards, types of business organisations, concepts and conventions, capital vs revenue expenditure, accounting equation, contingent liabilities.',
        topics: [
          { title: 'Accounting Concepts, Conventions and Standards' },
          { title: 'Accounting Information Systems & Stakeholder Needs' },
          { title: 'Capital and Revenue Income & Expenditure' },
          { title: 'Fundamental Accounting Equation & Rules of Debit/Credit' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Recording Transactions and Trial Balance',
        description: 'Journal entries, cash book, purchases, sales, returns, receivables and payables, inventory valuation, depreciation and amortization, reserves, GST accounting transactions, ledger posting, trial balance preparation and errors rectification.',
        topics: [
          { title: 'Journalizing, Sub-division of Journal & Ledger Posting' },
          { title: 'Depreciation, Amortization and Reserves Accounting' },
          { title: 'GST Transactions Recording & Accounting Treatment' },
          { title: 'Trial Balance Preparation & Rectification of Errors' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Preparation of Final Accounts of Sole Proprietorship',
        description: 'Preparation of Trading and Profit and Loss account, balance sheet of sole trading concerns, year-end adjustments, disclosure norms and financial statement presentation.',
        topics: [
          { title: 'Trading Account & Gross Profit Determination' },
          { title: 'Profit & Loss Account Preparation & Operating Expenses' },
          { title: 'Balance Sheet Preparation with Year-End Adjustments' },
          { title: 'Disclosures and Presentation Standards' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Company Final Accounts',
        description: 'Introduction to company accounts: Kinds, share capital, issue of shares, schedules to accounts, financial statements as per Companies Act 2013, income statement and balance sheet (horizontal and vertical formats).',
        topics: [
          { title: 'Company Share Capital & Issue of Shares Accounting' },
          { title: 'Provisions under Companies Act 2013 for Financial Statements' },
          { title: 'Preparation of Company Income Statement' },
          { title: 'Preparation of Company Balance Sheet (Horizontal & Vertical)' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 107',
    subject_name: 'IT Applications in Management',
    year_number: 1,
    semester_number: 1,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Basics of Computers and Their Evolution',
        description: 'Characteristics of computers, components, generations, applications in business, computer languages, compiler and interpreter, memory hierarchy and types.',
        topics: [
          { title: 'Computer Architecture, Block Diagram & Components' },
          { title: 'Generations of Computers & Business Applications' },
          { title: 'Programming Languages, Compilers & Interpreters' },
          { title: 'Primary & Secondary Storage and Memory Hierarchy' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Hardware, Software and Operating Systems',
        description: 'Hardware and software classification, input/output devices, operating system definition, functions, types of OS, GUI and CLI environments.',
        topics: [
          { title: 'System Software vs Application Software' },
          { title: 'Input and Output Peripherals in Business' },
          { title: 'Operating System Functions, Process & Memory Management' },
          { title: 'Classification of Operating Systems (Windows, Unix, Mobile)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Computer Networking and Internet Architecture',
        description: 'Overview of computer networks (LAN, WAN, MAN), topologies (Ring, Star, Bus, Mesh), internet architecture, internet services, differences between internet, intranet, and extranet.',
        topics: [
          { title: 'Network Types (LAN, WAN, MAN) & Architectures' },
          { title: 'Network Topologies & Transmission Media' },
          { title: 'Internet Protocols, Architecture & Web Services' },
          { title: 'Intranets, Extranets & Enterprise Network Security' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Office Productivity Suite (MS Word, Excel & PowerPoint)',
        description: 'Windows operating system, Microsoft Word document processing and formatting, Microsoft PowerPoint presentation design, multimedia, templates and hands-on lab exercises.',
        topics: [
          { title: 'Document Formatting, Tables & Mail Merge in MS Word' },
          { title: 'Presentation Design, Master Slides & Animations in PowerPoint' },
          { title: 'Spreadsheet Basics and Working with Data in Excel' },
          { title: 'Practical Lab Work & Business Reporting' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 109',
    subject_name: 'Business Communication',
    year_number: 1,
    semester_number: 1,
    credits: 2,
    hours: 20,
    category: 'Ability Enhancement',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Communication in Organizations',
        description: 'Business environment and communication, models of communication, types, channels and barriers, 7Cs of communication, formal vs informal networks, active listening.',
        topics: [
          { title: 'Communication Models, Channels & 7Cs Principles' },
          { title: 'Barriers to Communication and Remedial Strategies' },
          { title: 'Formal vs Informal Networks & Grapevine Communication' },
          { title: 'Active Listening & Social Media Communication Etiquettes' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Written Communication & Business Correspondence',
        description: 'Planning and layout of business letters, emails, positive and negative messages, sales letters, job application letters, professional resume writing, and resignation letters.',
        topics: [
          { title: 'Business Letters Layout, Format & Direct/Indirect Approach' },
          { title: 'Email Etiquette & Professional Correspondence' },
          { title: 'Sales, Complaint, Inquiries and Follow-up Letters' },
          { title: 'Job Application Letters & Professional Resume Writing' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Interpersonal & Presentation Communication',
        description: 'Team communication, managing virtual team communication, verbal and non-verbal skills, slide design, presentation delivery, infographics and modern presentation tools (Prezi, Canva, Zoho).',
        topics: [
          { title: 'Interpersonal Dynamics & Virtual Team Meetings' },
          { title: 'Verbal and Non-Verbal Presentation Techniques' },
          { title: 'Visual Aids, Slide Design & Infographics' },
          { title: 'Modern Alternatives (Prezi, Visme, Zoho Show)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Digital Communication & Corporate Etiquette',
        description: 'Media literacy, digital communication channels (instant messaging, video conferencing, e-meetings), digital citizenship, digital ethics and personal branding.',
        topics: [
          { title: 'Digital Collaboration Tools (Teams, Slack, Zoom)' },
          { title: 'Digital Citizenship, Etiquettes and Professional Brand' },
          { title: 'Online Video Conferencing & Virtual Meeting Protocols' },
          { title: 'Managing Organizational Websites & Digital Footprint' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 113',
    subject_name: 'Indian Constitution',
    year_number: 1,
    semester_number: 1,
    credits: 3,
    hours: 30,
    category: 'Humanities',
    units: [
      {
        unit_number: 1,
        unit_title: 'Economic History of the Constitution of India',
        description: 'Historical understanding of the Constitution as an economic document; Preamble; land reform cases in the 1950s; RBI cryptocurrency regulations; economic justice and constitutional design.',
        topics: [
          { title: 'Constitution as an Economic Document & Preamble Philosophy' },
          { title: 'Post-Colonial Economic History and Landmark Land Reforms' },
          { title: 'Legal Regulation of Economy & Economic Justice' },
          { title: 'Constitutional Design & Modern Commercial Governance' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Fundamental Rights and Business in India',
        description: 'Article 19(1)(g) right to practice trade and business, reasonable restrictions, right to equality, right to property evolution, and fundamental duties in commerce.',
        topics: [
          { title: 'Freedom of Trade, Profession & Occupation under Art 19(1)(g)' },
          { title: 'State Restrictions and Reasonable Grounds' },
          { title: 'Economic Implications of Fundamental Rights' },
          { title: 'Fundamental Duties and Civic Responsibility in Business' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Fiscal Federalism and Inter-State Trade',
        description: 'Articles 301 to 307 on freedom of trade, commerce and intercourse; vertical fiscal imbalance; Finance Commission (Article 280); GST Council and fiscal devolution.',
        topics: [
          { title: 'Inter-State Trade and Commerce (Articles 301-307)' },
          { title: 'Center-State Financial Relations & Fiscal Imbalance' },
          { title: 'Finance Commission (Article 280) & Revenue Sharing' },
          { title: 'GST Framework & Federal Tax Coordination' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Constitutional Battles That Shaped the Economy',
        description: 'Case studies: Banning diesel cars, telecom spectrum allocation and regulation, demonetisation, Aadhaar biometric verification, cryptocurrency judicial review.',
        topics: [
          { title: 'Landmark Financial Judgments & Corporate Impact' },
          { title: 'Telecom Regulation, Spectrum Auctions & Media Ownership' },
          { title: 'Judicial Scrutiny of Demonetisation & Aadhaar Framework' },
          { title: 'Cryptocurrency Legal Battles & Emerging Digital Economy' },
        ],
      },
    ],
  },

  // ============================================================================
  // FIRST YEAR — SEMESTER II (Academic Session 2024-25)
  // ============================================================================
  {
    subject_code: 'NBA 102',
    subject_name: 'Organization Behavior',
    year_number: 1,
    semester_number: 2,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Human Behavior and Organization',
        description: 'Meaning, importance, and historical development of organizational behavior; Contributing disciplines; Models of organizational behavior (autocratic, custodial, supportive, collegial).',
        topics: [
          { title: 'Concepts, Nature and Scope of Organizational Behavior' },
          { title: 'Historical Foundations & Contributing Disciplines' },
          { title: 'Models of Organizational Behavior' },
          { title: 'Challenges and Opportunities in Modern Workplace' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Individual Behavior, Perception and Motivation',
        description: 'Personality concepts, determinants, MBTI, Big Five; Attitudes and job satisfaction; Learning and reinforcement; Perception process; Content and process theories of motivation.',
        topics: [
          { title: 'Personality Determinants, Traits & Big Five Model' },
          { title: 'Workplace Attitudes, Values & Job Satisfaction' },
          { title: 'Perceptual Process, Attribution & Perceptual Distortions' },
          { title: 'Theories of Motivation (Maslow, Herzberg, Vroom, Goal-Setting)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Group and Team Dynamics',
        description: 'Foundations of group behavior, five-stage model of group development, group norms, cohesiveness, groupthink, teams vs groups, types of teams, conflict resolution.',
        topics: [
          { title: 'Five-Stage Model of Group Development & Norms' },
          { title: 'Group Decision Making, Groupthink & Group Shift' },
          { title: 'Building Effective Work Teams & Team Roles' },
          { title: 'Interpersonal Conflict & Negotiation Strategies' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Leadership, Culture and Change Management',
        description: 'Trait, behavioral, and contingency leadership theories; Transformational, servant, and authentic leadership; Organizational culture creation and sustenance; Organizational change and stress.',
        topics: [
          { title: 'Leadership Theories (Ohio/Michigan, Fiedler, Situational)' },
          { title: 'Transformational vs Transactional Leadership' },
          { title: 'Organizational Culture Dimensions & Climate' },
          { title: 'Change Management Models (Lewin, Kotter) & Workplace Stress' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 104',
    subject_name: 'Macro Economics',
    year_number: 1,
    semester_number: 2,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Measurement of Macroeconomic Variables',
        description: 'National Income accounts, GDP, Personal income, classical theory of output and employment, Quantity Theory of Money, aggregate demand and aggregate supply.',
        topics: [
          { title: 'Macroeconomic Goals & National Income Accounting' },
          { title: 'Classical Theory of Employment & Say’s Law' },
          { title: 'Quantity Theory of Money (Fisher and Cambridge)' },
          { title: 'Aggregate Demand and Classical AS Curve' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Simple Keynesian Model of Income Determination',
        description: 'Components of aggregate demand, consumption function, marginal propensity to consume, investment multiplier, equilibrium income determination in closed and open economy.',
        topics: [
          { title: 'Keynesian Consumption Function & Psychological Law' },
          { title: 'Investment Function & Marginal Efficiency of Capital' },
          { title: 'Autonomous Multiplier & Income Determination' },
          { title: 'Government Expenditure & Foreign Trade Multipliers' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'IS-LM Framework and Policy Effectiveness',
        description: 'Derivation of IS curve (goods market equilibrium), derivation of LM curve (money market equilibrium), intersection and determination of income and interest rates, monetary and fiscal policy effectiveness.',
        topics: [
          { title: 'Goods Market Equilibrium and the IS Curve' },
          { title: 'Money Market Equilibrium and the LM Curve' },
          { title: 'General Equilibrium in IS-LM Model' },
          { title: 'Relative Effectiveness of Monetary & Fiscal Policies' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Inflation, Unemployment and Balance of Payments',
        description: 'Types and causes of inflation, demand-pull and cost-push, Phillips curve, unemployment types, Balance of Payments structure, disequilibrium causes, exchange rate determination.',
        topics: [
          { title: 'Causes, Measurement and Consequences of Inflation' },
          { title: 'The Phillips Curve: Short-Run & Long-Run Trade-off' },
          { title: 'Balance of Payments (Current and Capital Accounts)' },
          { title: 'BoP Disequilibrium, Exchange Rates & Foreign Trade Policy' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 106',
    subject_name: 'Management Accounting',
    year_number: 1,
    semester_number: 2,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Cost and Management Accounting',
        description: 'Cost concepts, classification, cost sheet preparation, role of management accountant, relationship between financial, cost and management accounting.',
        topics: [
          { title: 'Nature, Scope & Role of Management Accounting' },
          { title: 'Elements of Cost: Material, Labour, and Overheads' },
          { title: 'Preparation of Cost Sheet & Tender Quotations' },
          { title: 'Cost Accounting vs Financial Accounting vs Management Accounting' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Marginal Costing and Budgetary Control',
        description: 'Marginal costing equations, break-even analysis, P/V ratio, margin of safety, managerial decision making (make or buy, product mix). Budgeting concepts, cash budget, flexible budget.',
        topics: [
          { title: 'Marginal Costing Concepts, Break-Even Charts & P/V Ratio' },
          { title: 'Margin of Safety & Angle of Incidence' },
          { title: 'Managerial Decisions: Make vs Buy, Shut-Down & Product Mix' },
          { title: 'Budgetary Control: Cash Budget & Flexible Budgeting' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Financial Statement Analysis and Ratio Analysis',
        description: 'Comparative statements, common size statements, trend analysis. Ratio analysis: Liquidity, solvency, activity/turnover, and profitability ratios.',
        topics: [
          { title: 'Techniques of Financial Statement Analysis' },
          { title: 'Liquidity Ratios: Current & Quick Ratios' },
          { title: 'Solvency and Leverage Ratios' },
          { title: 'Activity, Efficiency and Profitability Ratios (DuPont Analysis)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Cash Flow Statement & Management Reporting',
        description: 'Cash Flow Statement as per AS-3: Operating, investing, and financing activities. Difference between cash flow and funds flow. Management reporting formats and objectives.',
        topics: [
          { title: 'Cash Flow Statement Concepts & Significance (AS-3)' },
          { title: 'Cash Flow from Operating Activities (Direct & Indirect)' },
          { title: 'Cash Flow from Investing & Financing Activities' },
          { title: 'Management Reporting Principles & Executive Dashboards' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 108',
    subject_name: 'Business Statistics',
    year_number: 1,
    semester_number: 2,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Measures of Central Tendency, Dispersion and Skewness',
        description: 'Collection and presentation of data, mean, median, mode, geometric and harmonic mean, quartiles, range, mean deviation, standard deviation, variance, coefficient of variation, skewness and kurtosis.',
        topics: [
          { title: 'Data Tabulation, Frequency Distributions & Graphs' },
          { title: 'Measures of Central Tendency (Mean, Median, Mode)' },
          { title: 'Measures of Dispersion (Range, MD, SD, Variance, CV)' },
          { title: 'Karl Pearson and Bowley Measures of Skewness & Kurtosis' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Correlation and Regression Analysis',
        description: 'Scatter diagram, Karl Pearson correlation coefficient, Spearman rank correlation, regression lines (X on Y, Y on X), regression coefficients, standard error of estimate.',
        topics: [
          { title: 'Correlation Types, Scatter Diagram & Karl Pearson Coefficient' },
          { title: 'Spearman Rank Correlation Coefficient' },
          { title: 'Linear Regression Lines and Normal Equations' },
          { title: 'Properties of Regression Coefficients & Estimation' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Probability and Probability Distributions',
        description: 'Basic probability concepts, addition and multiplication theorems, conditional probability, Bayes theorem, Binomial, Poisson, and Normal distributions.',
        topics: [
          { title: 'Classical & Axiomatic Probability Theorems' },
          { title: 'Conditional Probability & Bayes Theorem Applications' },
          { title: 'Binomial and Poisson Discrete Probability Distributions' },
          { title: 'Normal Continuous Distribution & Z-Score Tables' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Logical Reasoning and Spreadsheet Data Analysis',
        description: 'Series, coding-decoding, direction sense, seating arrangements, blood relations. Practical Excel component for handling realistic business data and computing statistical metrics.',
        topics: [
          { title: 'Mathematical & Logical Reasoning Problems' },
          { title: 'Excel Statistical Functions (AVERAGE, STDEV, CORREL)' },
          { title: 'Pivot Tables, Charting & Data Visualizations' },
          { title: 'Practical Data Interpretation & Presentation' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 110',
    subject_name: 'Business Environment',
    year_number: 1,
    semester_number: 2,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Scope and Characteristics of Business Environment',
        description: 'Micro and macro environmental factors, environmental scanning techniques (PESTEL), significance for organizational decision making, ethical business practices.',
        topics: [
          { title: 'Micro & Macro Environmental Factors' },
          { title: 'Environmental Scanning Framework (PESTEL)' },
          { title: 'Significance of Business Environment on Decision Making' },
          { title: 'Business Ethics & Values in Corporate Operations' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Structure of the Indian Economy and Economic Reforms',
        description: 'Economic resources, impact of Liberalization, Privatization and Globalization (LPG), GDP trends, population, urbanization, fiscal deficit, per capita income.',
        topics: [
          { title: 'Salient Features of Indian Economic System' },
          { title: 'LPG Reforms of 1991 and Industrial Re-structuring' },
          { title: 'Macroeconomic Indicators: GDP, Deficits & Inflation' },
          { title: 'Urbanization, Demographics & Economic Growth' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Political, Legal and Technological Environment',
        description: 'Economic roles of government, fiscal, monetary, and EXIM policies, foreign investment regulation, technology transfer and technological environment in India.',
        topics: [
          { title: 'Government Economic Roles: Regulatory & Promotional' },
          { title: 'Fiscal Policy, Monetary Policy & Trade Reforms' },
          { title: 'Foreign Direct Investment (FDI) & Collaboration Policies' },
          { title: 'Technology Transfer, R&D and Digital Transformation' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Socio-Cultural and Global Environment',
        description: 'Business and society, social responsibility of business, culture and corporate behavior, MNCs in India, global business trends and competitive landscape.',
        topics: [
          { title: 'Socio-Cultural Dimensions of Business in India' },
          { title: 'Corporate Social Responsibility & Stakeholder Engagement' },
          { title: 'Role, Strengths and Criticisms of MNCs' },
          { title: 'Global Trade Environment & Contemporary Indian Industry' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 114',
    subject_name: 'Managing Equality and Diversity',
    year_number: 1,
    semester_number: 2,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Nature of Diversity and Equity',
        description: 'Diversity and equity meanings, classifications of diversity, equity vs equality, components of inclusion, business case for diversity and equality in modern organizations.',
        topics: [
          { title: 'Concepts of Diversity, Equity and Inclusion (DEI)' },
          { title: 'Equality vs Equity: Philosophical and Operational Differences' },
          { title: 'Primary and Secondary Dimensions of Diversity' },
          { title: 'The Business Case for Inclusion in Modern Organizations' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Theoretical Frameworks and Legal Regulations',
        description: 'Sociological and psychological theories on DEI; Pluralistic organizations; Workplace harassment prevention, POSH Act, constitutional mandates and global standards.',
        topics: [
          { title: 'Sociological and Organizational Theories of DEI' },
          { title: 'Legal & Regulatory Frameworks (POSH Act, Equal Remuneration)' },
          { title: 'Preventing Workplace Harassment, Bullying and Bias' },
          { title: 'Designing Non-Discriminatory Organizational Policies' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Biases, Macro-aggressions and Inclusive Leadership',
        description: 'Implicit bias, categories of macro-aggressions, impact on employee lifecycle, in-groups and out-groups, inclusive communication strategies, active listening.',
        topics: [
          { title: 'Unconscious and Implicit Bias in Workplace Decisions' },
          { title: 'Macro-aggressions: Types, Psychological Impact & Remedies' },
          { title: 'In-Group vs Out-Group Dynamics in Employee Retention' },
          { title: 'Inclusive Language, Verbal Communication & Empathy' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Diversity Management Programs and Psychological Safety',
        description: 'Inclusive recruiting and hiring practices, accessibility for differently-abled, gender identity support, creating psychological safety and DEI governance.',
        topics: [
          { title: 'Inclusive Talent Acquisition, Hiring & Retention' },
          { title: 'Workplace Accessibility, Accommodations & Gender Support' },
          { title: 'Psychological Safety: Culture, Measurement & Leadership' },
          { title: 'Evaluating DEI Impact on Organizational Innovation' },
        ],
      },
    ],
  },

  // ============================================================================
  // SECOND YEAR — SEMESTER III (Academic Session 2024-25)
  // ============================================================================
  {
    subject_code: 'NBA 201',
    subject_name: 'Human Resource Management',
    year_number: 2,
    semester_number: 3,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'The Nature and Strategic Role of HRM',
        description: 'Introduction to HRM, HR business partnership, HRM policies, global HR environment, functional vs strategic human resource management (SHRM).',
        topics: [
          { title: 'Evolution, Scope and Objectives of Human Resource Management' },
          { title: 'HR Business Partnering (HRBP) & Corporate Strategy' },
          { title: 'HR Policies and Global Workforce Competitiveness' },
          { title: 'Strategic Human Resource Management (SHRM) Framework' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Talent Acquisition, Planning and Development',
        description: 'Employee lifecycle, human resource planning, recruitment and selection, training and development, competency mapping, talent management, virtual workforce.',
        topics: [
          { title: 'Human Resource Planning (HRP) & Forecasting Demand/Supply' },
          { title: 'Recruitment Strategies, Selection Processes & Assessment' },
          { title: 'Training Needs Assessment (TNA) & Executive Development' },
          { title: 'Talent Management & Managing Gig/Virtual Workforces' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Employee Engagement, Performance and Compensation',
        description: 'Performance appraisal systems (360 degree, OKRs, KPIs), compensation and reward management, industrial relations, labor regulations, employee relations.',
        topics: [
          { title: 'Employee Engagement Drivers & Retention Strategies' },
          { title: 'Performance Management Systems (OKRs, KPIs, 360-Degree)' },
          { title: 'Compensation Structuring, Benefits & Incentive Schemes' },
          { title: 'Industrial Relations, Dispute Resolution & Labor Compliance' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'HR Analytics, Digital HR and Future Trends',
        description: 'HRIS systems, HR metrics and analytics, HR innovation in SMEs and services, organizational transformation, green HRM and workplace wellness.',
        topics: [
          { title: 'Human Resource Information Systems (HRIS) & Architecture' },
          { title: 'HR Metrics, People Analytics & Predictive Modeling' },
          { title: 'Green HRM, Sustainability & Employee Wellness Programs' },
          { title: 'Digital HR Transformation & Future of Work' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 203',
    subject_name: 'International Economics',
    year_number: 2,
    semester_number: 3,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to International Trade Theories',
        description: 'Meaning and scope of international trade, differences between internal and international trade, classical and modern trade theories: Adam Smith, David Ricardo, Heckscher-Ohlin.',
        topics: [
          { title: 'Scope and Significance of International Trade' },
          { title: 'Theory of Absolute Advantage (Adam Smith)' },
          { title: 'Theory of Comparative Advantage (David Ricardo)' },
          { title: 'Factor Endowment Theory (Heckscher-Ohlin Model)' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Free Trade vs Protectionism and Trade Barriers',
        description: 'Case for and against free trade, protectionism, tariffs (types and economic effects), non-tariff barriers, quotas, dumping, and retaliatory measures.',
        topics: [
          { title: 'Free Trade Arguments and Welfare Implications' },
          { title: 'Protectionism Rationale & Infant Industry Argument' },
          { title: 'Tariffs: Specific, Ad-Valorem & Economic Impact' },
          { title: 'Non-Tariff Barriers, Import Quotas & WTO Provisions' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Balance of Payments and Trade Imbalances',
        description: 'Balance of Trade vs Balance of Payments, current account and capital account components, BoP disequilibrium causes, adjustment mechanisms, foreign exchange reserves.',
        topics: [
          { title: 'Structure and Components of Balance of Payments' },
          { title: 'Current Account vs Capital Account Dynamics' },
          { title: 'Causes of BoP Deficit & Corrective Policy Measures' },
          { title: 'Management of Foreign Exchange Reserves in India' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Foreign Exchange Markets and Exchange Rate Determination',
        description: 'Foreign exchange market functions, fixed vs floating exchange rates, mint parity theory, Purchasing Power Parity (PPP), currency devaluation and depreciation.',
        topics: [
          { title: 'Foreign Exchange Market Mechanics and Participants' },
          { title: 'Fixed vs Flexible Exchange Rate Systems' },
          { title: 'Purchasing Power Parity (PPP) & Interest Rate Parity' },
          { title: 'Currency Devaluation, Depreciation & RBI Interventions' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 205',
    subject_name: 'Financial Management',
    year_number: 2,
    semester_number: 3,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Foundations of Financial Management and Sources of Finance',
        description: 'Scope, objectives: Profit vs wealth maximization, financial decisions (investing, financing, dividend), time value of money, short-term and long-term financing sources.',
        topics: [
          { title: 'Scope & Objectives: Wealth vs Profit Maximization' },
          { title: 'Time Value of Money (PV, FV, Annuity, Perpetuity)' },
          { title: 'Long-Term Financing: Equity, Preference, Debt & Hybrids' },
          { title: 'Internal Financing & Retained Earnings Strategies' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Capital Structure and Capitalization Theories',
        description: 'Meaning of capitalization, over/under capitalization, capital structure theories (Net Income, NOI, Traditional, Modigliani-Miller), EBIT-EPS analysis, optimum capital structure.',
        topics: [
          { title: 'Capital Structure Theories (NI, NOI, Traditional & MM)' },
          { title: 'Over-Capitalization and Under-Capitalization Remedies' },
          { title: 'EBIT-EPS Analysis & Financial Indifference Points' },
          { title: 'Determinants of Optimal Capital Structure' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Cost of Capital, Leverages and Working Capital',
        description: 'Computation of specific costs of capital (debt, preference, equity), Weighted Average Cost of Capital (WACC), CAPM, operating, financial and combined leverages.',
        topics: [
          { title: 'Cost of Debt, Preference Capital and Equity Shares' },
          { title: 'Weighted Average Cost of Capital (WACC) & Book/Market Weights' },
          { title: 'Operating Leverage, Financial Leverage & Combined Leverage' },
          { title: 'Working Capital Cycle and Operating Cash Requirements' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Capital Budgeting and Dividend Policy',
        description: 'Capital budgeting process, appraisal methods: Payback period, ARR, NPV, IRR, Profitability Index. Dividend theories (Walter, Gordon, MM hypothesis), SEBI dividend guidelines.',
        topics: [
          { title: 'Capital Budgeting Evaluation Techniques (Payback, ARR)' },
          { title: 'Discounted Cash Flow Methods: NPV, IRR & PI' },
          { title: 'Dividend Theories: Relevance (Walter/Gordon) vs Irrelevance (MM)' },
          { title: 'Determinants of Dividend Policy & Corporate Regulations' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 207',
    subject_name: 'Marketing Management',
    year_number: 2,
    semester_number: 3,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction and Marketing Environment',
        description: 'Nature, scope, importance, evolution of marketing philosophies (production, product, selling, marketing, holistic marketing), marketing environment analysis.',
        topics: [
          { title: 'Core Marketing Concepts & Evolution of Market Orientations' },
          { title: 'Holistic Marketing Concept & Customer Value' },
          { title: 'Macro & Micro Environmental Analysis for Marketers' },
          { title: 'Market Demographics, Socio-Cultural & Competitive Factors' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Market Segmentation, Targeting, Positioning and Consumer Behavior',
        description: 'STP process, bases for segmenting consumer markets, consumer buying decision process, stimulus-response model, psychological and cultural determinants.',
        topics: [
          { title: 'Market Segmentation Bases (Demographic, Geographic, Psychographic)' },
          { title: 'Target Market Selection & Brand Positioning Strategies' },
          { title: 'Consumer Decision Making Process & Buyer Behavior Models' },
          { title: 'Factors Influencing Consumer Decisions in Indian Market' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Product Decisions, Branding and Pricing Strategies',
        description: 'Product levels, Product Life Cycle (PLC) strategies, product mix, brand management, packaging, pricing determinants, pricing methods (cost-based, value-based, psychological).',
        topics: [
          { title: 'Product Hierarchy, Mix Decisions & PLC Strategies' },
          { title: 'Branding Principles, Brand Equity & Packaging Innovations' },
          { title: 'New Product Development Process & Commercialization' },
          { title: 'Pricing Objectives, Strategies & Tactical Price Adjustments' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Integrated Marketing Communications and Distribution',
        description: 'Promotion mix: Advertising, sales promotion, PR, personal selling, digital marketing. Marketing channels: Levels, channel conflict, logistics, wholesaling, retailing.',
        topics: [
          { title: 'Integrated Marketing Communications (IMC) Framework' },
          { title: 'Advertising Design, Media Planning & Sales Promotion' },
          { title: 'Marketing Channels: Structure, Intermediaries & Conflict' },
          { title: 'Retail Trends, E-Commerce Distribution & Logistics' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 209',
    subject_name: 'Business Law',
    year_number: 2,
    semester_number: 3,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Indian Contract Act 1872',
        description: 'Essentials of a valid contract, offer and acceptance, consideration, contractual capacity, free consent, legality of object, breach of contract and remedies, quasi contracts.',
        topics: [
          { title: 'Essentials of Valid Contract & Classification of Contracts' },
          { title: 'Offer, Acceptance, Consideration & Free Consent' },
          { title: 'Discharge of Contract, Breach and Legal Remedies' },
          { title: 'Contracts of Indemnity, Guarantee, Bailment and Pledge' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Sale of Goods Act 1930 & Negotiable Instruments Act 1881',
        description: 'Contract of sale, conditions and warranties, transfer of property, rights of unpaid seller. Negotiable instruments: Promissory notes, bills of exchange, cheques, dishonor of cheques.',
        topics: [
          { title: 'Contract of Sale, Conditions vs Warranties & Caveat Emptor' },
          { title: 'Rights of Unpaid Seller against Goods and Buyer' },
          { title: 'Negotiable Instruments Characteristics, Types & Endorsements' },
          { title: 'Holder in Due Course & Section 138 Dishonor of Cheques' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'The Companies Act 2013',
        description: 'Nature and types of companies, incorporation process, Memorandum & Articles of Association, prospectus, share capital, directors role, meetings, resolutions.',
        topics: [
          { title: 'Company Features, Types & Corporate Veil Piercing' },
          { title: 'Incorporation Documents: Memorandum & Articles of Association' },
          { title: 'Prospectus, Allotment of Shares & Corporate Governance' },
          { title: 'Directors Appointment, Powers, Duties & Company Meetings' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'LLP Act 2008 & Consumer Protection Act 2019',
        description: 'Limited Liability Partnership Act 2008: Features, formation, partners relations. Consumer Protection Act 2019: Consumer rights, dispute redressal commissions, e-commerce rules.',
        topics: [
          { title: 'LLP Features, Advantages, Formation & Conversion' },
          { title: 'Rights and Liabilities of Partners in LLP' },
          { title: 'Consumer Rights & Unfair Trade Practices under CPA 2019' },
          { title: 'Three-Tier Consumer Dispute Redressal Machinery & Mediation' },
        ],
      },
    ],
  },
  {
    subject_code: 'NMA 209',
    subject_name: 'Business Mathematics',
    year_number: 2,
    semester_number: 3,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Progressions and Combinatorics in Business',
        description: 'Arithmetic Progression (AP), Geometric Progression (GP), infinite geometric series, permutations and combinations, counting principles, simple business finance applications.',
        topics: [
          { title: 'Arithmetic Progressions & Business Applications' },
          { title: 'Geometric Progressions & Compound Growth Problems' },
          { title: 'Fundamental Principles of Counting' },
          { title: 'Permutations and Combinations with Business Scenarios' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Matrix Algebra and Systems of Equations',
        description: 'Matrix operations (addition, multiplication), transpose, determinants, adjoint, matrix inverse, solving systems of linear equations using Cramer’s rule and matrix inversion.',
        topics: [
          { title: 'Matrix Types, Matrix Algebra & Operations' },
          { title: 'Determinants of Matrices & Evaluation Methods' },
          { title: 'Adjoint and Inverse of a Square Matrix' },
          { title: 'Solving Linear Systems using Cramer’s Rule & Matrix Inversion' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Differential Calculus and Optimization',
        description: 'Concept of derivative, product rule, quotient rule, chain rule, logarithmic and exponential differentiation, maxima and minima in revenue, cost and profit functions.',
        topics: [
          { title: 'Rules of Differentiation (Power, Product, Quotient, Chain)' },
          { title: 'Differentiation of Logarithmic & Exponential Functions' },
          { title: 'Marginal Revenue, Marginal Cost & Profit Functions' },
          { title: 'Optimization: Maxima and Minima in Economic Decisions' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Integral Calculus and Business Applications',
        description: 'Standard integration rules, integration by substitution, integration by parts, partial fractions, consumer surplus and producer surplus applications.',
        topics: [
          { title: 'Fundamental Rules of Indefinite and Definite Integration' },
          { title: 'Integration by Substitution and by Parts' },
          { title: 'Cost and Revenue Function Derivation from Marginals' },
          { title: 'Consumer Surplus and Producer Surplus Computations' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 211',
    subject_name: 'Communication Skills',
    year_number: 2,
    semester_number: 3,
    credits: 3,
    hours: 30,
    category: 'Skill Enhancement',
    units: [
      {
        unit_number: 1,
        unit_title: 'Listening and Spoken Communication',
        description: 'Techniques of effective listening, listening comprehension, probing questions, barriers, pronunciation, enunciation, vocabulary building, common grammatical errors.',
        topics: [
          { title: 'Listening Comprehension & Active Probing Techniques' },
          { title: 'Pronunciation, Enunciation & Phonetic Clarity' },
          { title: 'Vocabulary Enhancement & Fluency Development' },
          { title: 'Overcoming Spoken Hesitation & Speech Delivery' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Reading and Professional Writing Modes',
        description: 'Effective reading strategies, synthesizing text, evaluating arguments, professional writing process, structural coherence, executive summaries and analytical memos.',
        topics: [
          { title: 'Skimming, Scanning & Critical Text Interpretation' },
          { title: 'Structuring Business Memos & Executive Summaries' },
          { title: 'Analytical Report Writing & Argumentation' },
          { title: 'Editing, Proofreading and Style Consistency' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Digital Literacy and Social Media Communication',
        description: 'Computer tools, online educational resources, AI in business communication, social media etiquettes, digital marketing communication analytics.',
        topics: [
          { title: 'Digital Productivity & Cloud Collaboration Platforms' },
          { title: 'Social Media Professional Etiquettes & Networking' },
          { title: 'AI Tools in Written Business Communication' },
          { title: 'Digital Marketing Metrics & Engagement Analytics' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Digital Ethics, Cyber Security and Non-Verbal Skills',
        description: 'Digital ethics, cyber safety and passwords hygiene, body language, eye contact, facial expressions, hand gestures, kinesics and proxemics in business.',
        topics: [
          { title: 'Digital Ethics, Privacy Protection & Cyber Hygiene' },
          { title: 'Kinesics: Posture, Gestures & Facial Expressions' },
          { title: 'Proxemics, Eye Contact and Professional Decorum' },
          { title: 'Practical Non-Verbal Communication Role Plays' },
        ],
      },
    ],
  },

  // ============================================================================
  // SECOND YEAR — SEMESTER IV (Academic Session 2024-25)
  // ============================================================================
  {
    subject_code: 'NBA 202',
    subject_name: 'Production and Operations Management',
    year_number: 2,
    semester_number: 4,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Operations Management',
        description: 'Meaning, nature, scope, difference between production and operations, operations strategy, productivity measurement, work study, method study and work measurement.',
        topics: [
          { title: 'Nature, Scope & Evolution of Operations Management' },
          { title: 'Operations Strategy for Competitive Advantage' },
          { title: 'Productivity Measurement (Single, Multi & Total Factor)' },
          { title: 'Work Study, Method Study & Time Measurement' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Process Design, Facility Layout and Capacity Planning',
        description: 'Strategic process choices (job, batch, mass, continuous), facility location factors, layout design (product, process, cellular, fixed-position), capacity planning.',
        topics: [
          { title: 'Process Flowcharting & Service Process Mapping' },
          { title: 'Facility Location Models & Selection Criteria' },
          { title: 'Plant Layout Types: Product, Process & Cellular' },
          { title: 'Capacity Requirement Planning & Bottleneck Management' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Quality Management and Lean Manufacturing',
        description: 'Quality concepts, Total Quality Management (TQM) principles, ISO standards, Six Sigma DMAIC methodology, 7 QC tools, Lean manufacturing, waste elimination.',
        topics: [
          { title: 'Total Quality Management (TQM) & Cost of Quality' },
          { title: 'Seven Basic Quality Control Tools (Fishbone, Pareto, etc.)' },
          { title: 'Six Sigma DMAIC Methodology & Statistical Quality Control' },
          { title: 'Lean Manufacturing, 5S Principles & Just-In-Time (JIT)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Inventory Control, Supply Chain and Emerging Trends',
        description: 'Inventory management: EOQ model, ABC/VED analysis, safety stock. Supply chain management overview, Industry 4.0, IoT and sustainability in modern manufacturing.',
        topics: [
          { title: 'Inventory Management: EOQ Model & Quantity Discounts' },
          { title: 'Selective Inventory Control Techniques (ABC, VED, FSN)' },
          { title: 'Supply Chain Coordination & Bullwhip Effect' },
          { title: 'Industry 4.0, Smart Factories & Sustainable Operations' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 204',
    subject_name: 'Introduction to Business Analytics',
    year_number: 2,
    semester_number: 4,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Foundations of Business Analytics',
        description: 'Definition, categorization (descriptive, predictive, prescriptive), analytics in practice, Big Data dimensions (volume, velocity, variety), decision modeling.',
        topics: [
          { title: 'Analytics Taxonomy: Descriptive, Predictive, Prescriptive' },
          { title: 'Big Data Dimensions (5Vs) & Business Applications' },
          { title: 'Business Decision Modeling & Analytical Problem Formulation' },
          { title: 'Data Types, Formats and Data Hygiene' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Descriptive Analytics and Data Visualization',
        description: 'Summary statistics (central tendency, variability), data visualization principles, dashboard design in Excel and SPSS, cross tabulations, visual storytelling.',
        topics: [
          { title: 'Summary Metrics & Exploratory Data Analysis' },
          { title: 'Data Visualization Techniques & Best Practices' },
          { title: 'Cross Tabulations & Pivot Table Dashboards' },
          { title: 'Interactive Business Reporting in Excel' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Predictive Analytics and Data Mining',
        description: 'Trend analysis, simple and multiple linear regression, time series forecasting, data mining approaches, classification, association rule mining, cause-effect modeling.',
        topics: [
          { title: 'Linear and Multiple Regression Modeling' },
          { title: 'Time Series Forecasting Methods & Decomposition' },
          { title: 'Data Mining Primitives & Data Pre-processing' },
          { title: 'Classification, Association Rules & Cluster Analysis' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Prescriptive Analytics and Optimization',
        description: 'Linear programming optimization, integer programming, cutting plane algorithm, decision analysis under risk and uncertainty, web and text analytics introduction.',
        topics: [
          { title: 'Optimization Modeling using Excel Solver' },
          { title: 'Decision Analysis under Uncertainty & Payoff Tables' },
          { title: 'Sensitivity Analysis & Shadow Pricing' },
          { title: 'Introduction to Web, Social Media & Text Analytics' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 206',
    subject_name: 'Business Research Methods',
    year_number: 2,
    semester_number: 4,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Research Process',
        description: 'Definition, types of business research (exploratory, descriptive, causal), research ethics, scientific inquiry steps, features of good research design.',
        topics: [
          { title: 'Types of Business Research: Exploratory, Descriptive, Causal' },
          { title: 'Scientific Research Process & Hypothesis Formulation' },
          { title: 'Research Ethics, Plagiarism & Integrity Standards' },
          { title: 'Components of Comprehensive Research Proposals' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Problem Formulation and Research Design',
        description: 'Literature review methodologies, research gap identification, conceptual frameworks, formulating research questions and operational objectives.',
        topics: [
          { title: 'Literature Review Protocols & Gap Identification' },
          { title: 'Formulating Problem Statement & Research Questions' },
          { title: 'Qualitative vs Quantitative Research Designs' },
          { title: 'Experimental and Quasi-Experimental Designs' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Measurement, Scaling and Data Collection',
        description: 'Measurement scales (nominal, ordinal, interval, ratio), Likert scaling, reliability and validity, questionnaire design, sampling techniques (probability & non-probability).',
        topics: [
          { title: 'Measurement Scales (Nominal, Ordinal, Interval, Ratio)' },
          { title: 'Construct Validity, Reliability & Cronbach Alpha' },
          { title: 'Questionnaire Design Principles & Pre-Testing' },
          { title: 'Probability and Non-Probability Sampling Designs' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Data Analysis, Hypothesis Testing and Report Writing',
        description: 'Data preparation (coding, editing), parametric tests (t-test, ANOVA) and non-parametric tests (chi-square), data visualization, report structuring and APA references.',
        topics: [
          { title: 'Data Cleaning, Coding & Statistical Preparation' },
          { title: 'Parametric Hypothesis Testing (t-Test, F-Test, ANOVA)' },
          { title: 'Non-Parametric Testing (Chi-Square Goodness of Fit)' },
          { title: 'Academic Report Formatting, Citations & APA Referencing' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 208',
    subject_name: 'Entrepreneurship and Innovation Management',
    year_number: 2,
    semester_number: 4,
    credits: 3,
    hours: 30,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Entrepreneurship and Family Business',
        description: 'Entrepreneur characteristics, types, role in economic development, family business characteristics in India (Tata, Birla, Reliance, Godrej, Dabur).',
        topics: [
          { title: 'Entrepreneurial Mindset, Traits & Socio-Economic Impact' },
          { title: 'Typology of Entrepreneurs & Startup Ventures' },
          { title: 'Family Business Governance & Succession Planning' },
          { title: 'Case Studies of Prominent Indian Family Conglomerates' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Opportunity Recognition and Feasibility Analysis',
        description: 'Idea generation sources, market potential estimation, product/service feasibility, industry competition analysis, business model canvas.',
        topics: [
          { title: 'Sources of Innovative Business Ideas & Ideation' },
          { title: 'Market Sizing (TAM, SAM, SOM) & Competitor Analysis' },
          { title: 'Technical, Financial and Operational Feasibility' },
          { title: 'Constructing the Business Model Canvas (BMC)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Venture Creation, Funding and Marketing',
        description: 'Low-cost growth hacking, startup team formation, venture capital, angel investment, bootstrapping, seed funding, legal compliances and IPR basics.',
        topics: [
          { title: 'Bootstrapping Strategies & Lean Startup Methodology' },
          { title: 'Venture Capital, Angel Investors & Term Sheets' },
          { title: 'Legal Incorporation, GST & Regulatory Compliances' },
          { title: 'Intellectual Property Protection (Patents, Trademarks, Copyrights)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Startup Ecosystem and Government Initiatives',
        description: 'Incubators and accelerators, Startup India, Make in India, MSME schemes, technology transfer centers, scaling challenges and exit strategies.',
        topics: [
          { title: 'Incubation, Acceleration & Technology Parks' },
          { title: 'Government Schemes: Startup India, Standup India & MSME Loans' },
          { title: 'Pitch Deck Creation & Investor Presentation Techniques' },
          { title: 'Scaling Strategies, Pivot Scenarios & Exit Options' },
        ],
      },
    ],
  },
  {
    subject_code: 'NMA 210',
    subject_name: 'Operations Research',
    year_number: 2,
    semester_number: 4,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Linear Programming Problems (LPP)',
        description: 'LPP formulation, graphical solution (bounded, unbounded, infeasible, multiple optima), simplex method, Big-M method, two-phase method, duality principles.',
        topics: [
          { title: 'LPP Mathematical Formulation & Assumptions' },
          { title: 'Graphical Method for 2-Variable Optimization' },
          { title: 'Simplex Algorithm: Tableau Computations & Optimality' },
          { title: 'Duality Concept & Economic Interpretation of Dual' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Transportation and Assignment Models',
        description: 'Initial basic feasible solution (North-West Corner, Least Cost, Vogel’s Approximation Method), MODI test for optimality, unbalanced transportation, Hungarian assignment method.',
        topics: [
          { title: 'Transportation Problem Formulation & Balanced/Unbalanced Cases' },
          { title: 'IBFS Determination (NWCM, LCM, VAM)' },
          { title: 'MODI Method for Optimality Testing & Stepping Stone' },
          { title: 'Hungarian Algorithm for Optimal Assignment Problems' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Project Management: CPM and PERT',
        description: 'Network construction, critical path calculation, float analysis (total float, free float, independent float), PERT probabilistic time estimates, project crashing and cost-time tradeoff.',
        topics: [
          { title: 'Network Diagrams (AOA, AON) & Precedence Relationships' },
          { title: 'Critical Path Method (CPM) Forward & Backward Passes' },
          { title: 'Program Evaluation & Review Technique (PERT) Three-Time Estimates' },
          { title: 'Project Crashing, Direct/Indirect Costs & Crash Slopes' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Decision Theory and Markov Analysis',
        description: 'Decision making under risk and uncertainty, payoff tables, EMV, EOL, EVPI, decision trees, Markov chains, transition probability matrices, steady-state conditions.',
        topics: [
          { title: 'Decision Criteria under Uncertainty (Maximax, Maximin, Hurwicz)' },
          { title: 'Expected Monetary Value (EMV) & Expected Opportunity Loss' },
          { title: 'Decision Trees for Multi-Stage Decision Making' },
          { title: 'Markov Chains, Transition Matrices & Brand Switching Applications' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 212',
    subject_name: 'Professional Skills',
    year_number: 2,
    semester_number: 4,
    credits: 3,
    hours: 30,
    category: 'Skill Enhancement',
    units: [
      {
        unit_number: 1,
        unit_title: 'Teamwork, Collaboration and Conflict Resolution',
        description: 'Team dynamics, defining roles, overcoming team challenges, building trust, sources of workplace friction, conflict resolution strategies, goal setting.',
        topics: [
          { title: 'Team Building Dynamics, Cohesion & Trust Formation' },
          { title: 'Belbin Team Roles & Role Allocation' },
          { title: 'Conflict Management Strategies in Cross-Functional Teams' },
          { title: 'Milestone Setting, Accountability & Constructive Feedback' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Emotional Intelligence (EI) in the Workplace',
        description: 'Emotional intelligence definition and components (self-awareness, self-regulation, internal motivation, empathy, social skills), benefits for business managers.',
        topics: [
          { title: 'Foundations and Dimensions of Emotional Intelligence (Goleman)' },
          { title: 'Self-Awareness & Emotional Self-Regulation' },
          { title: 'Empathy in Client Interfacing & Team Leadership' },
          { title: 'Managing Stress, Cognitive Resilience & Professional Poise' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Resume Engineering, ATS and Interview Mastery',
        description: 'CV vs Resume vs Biodata, essential components, Applicant Tracking System (ATS) optimization, mock interviews, behavioral questions (STAR technique).',
        topics: [
          { title: 'Resume vs Curriculum Vitae Standards' },
          { title: 'ATS Optimization, Keywords & Formatting Guidelines' },
          { title: 'Interview Preparation: Behavioral Questions & STAR Method' },
          { title: 'Handling Salary Negotiations & Professional Follow-Ups' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Group Discussions and Professional Digital Presence',
        description: 'Group discussion methodology, roles in GD, ground rules, LinkedIn profile optimization, professional netiquette, building an online thought leadership presence.',
        topics: [
          { title: 'Group Discussion Strategies: Initiation, Moderation, Summarization' },
          { title: 'Common GD Fallacies & Evaluation Parameters' },
          { title: 'LinkedIn Profile Crafting, Endorsements & Networking' },
          { title: 'Digital Netiquette & Professional Personal Branding' },
        ],
      },
    ],
  },

  // ============================================================================
  // THIRD YEAR — SEMESTER V (Academic Session 2024-25)
  // ============================================================================
  {
    subject_code: 'NBA 303',
    subject_name: 'Business Ethics and Corporate Governance',
    year_number: 3,
    semester_number: 5,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Business Ethics Fundamentals',
        description: 'Meaning, principles of business ethics, characteristics of ethical organizations, globalization and ethics, stakeholders protection.',
        topics: [
          { title: 'Principles and Theories of Business Ethics' },
          { title: 'Characteristics of Ethical Corporate Culture' },
          { title: 'Globalization, Fair Trade and Ethical Dilemmas' },
          { title: 'Stakeholder Interests Protection & Corporate Integrity' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Conceptual Framework of Corporate Governance',
        description: 'Meaning, significance, principles, Agency Theory, Stewardship Theory, Stakeholder Theory, single-tier vs two-tier board structures.',
        topics: [
          { title: 'Core Principles & Pillars of Corporate Governance' },
          { title: 'Theories: Agency Theory, Stewardship Theory, Stakeholder Theory' },
          { title: 'Board Architecture: One-Tier vs Two-Tier Systems' },
          { title: 'Role of Board Committees (Audit, Nomination, Remuneration)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Role of Stakeholders, Board Committees and Whistleblowing',
        description: 'Board composition (executive, non-executive, independent directors), insider trading regulations, shareholder activism, class action suits, whistleblowing mechanism, CSR.',
        topics: [
          { title: 'Independent Directors: Roles, Rights and Liabilities' },
          { title: 'SEBI Prohibition of Insider Trading Regulations' },
          { title: 'Shareholder Activism and Class Action Suits' },
          { title: 'Whistle-Blowing Framework & Mandatory CSR Provisions' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Regulatory Committees and Landmark Corporate Failures',
        description: 'Kumar Mangalam Birla, Narayana Murthy, Uday Kotak committees; Companies Act 2013 and SEBI LODR 2015 regulations; Case studies: Satyam, Kingfisher, PNB, ICICI.',
        topics: [
          { title: 'Recommendations of Birla, Murthy & Kotak Committees' },
          { title: 'SEBI Listing Obligations & Disclosure Requirements (LODR)' },
          { title: 'Anatomy of Corporate Frauds (Satyam, Enron, PNB)' },
          { title: 'Reforms and Risk Governance in Banking & Corporate India' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 305',
    subject_name: 'Design Thinking',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Basics of Design Thinking and Customer Centricity',
        description: 'Concept of innovation in business, creative problem solving, design thinking process and principles, customer experience enhancement.',
        topics: [
          { title: 'Innovation Mindset & Design Thinking Philosophy' },
          { title: 'Customer Centricity & Understanding Customer Pain Points' },
          { title: 'Design Thinking Frameworks (Stanford d.school, Double Diamond)' },
          { title: 'Aligning Customer Expectations with Product Architecture' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Empathize and Define Problem Statements',
        description: 'Empathy mapping, user research, observation techniques, identifying wicked problems, problem definition and POV statements.',
        topics: [
          { title: 'Empathy Mapping, User Interviews & Field Observations' },
          { title: 'Synthesizing User Research & Customer Journey Mapping' },
          { title: 'Wicked Problems & Root Cause Analysis' },
          { title: 'Drafting Actionable Problem Statements (Point-of-View)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Ideation, Prototyping and Implementation',
        description: 'Brainstorming methods, divergent and convergent thinking, rapid prototyping, wireframing, physical models, minimum viable product (MVP).',
        topics: [
          { title: 'Ideation Techniques: Brainstorming, SCAMPER, Worst Possible Idea' },
          { title: 'Selecting Winning Ideas & Convergent Evaluation' },
          { title: 'Low-Fidelity Prototyping (Paper, Wireframes, Storyboards)' },
          { title: 'Developing Minimum Viable Products (MVP)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'User Testing, Feedback and Iterative Re-Design',
        description: 'Feedback loops, user testing protocols, usability heuristics, redesigning based on feedback, presenting design solutions to stakeholders.',
        topics: [
          { title: 'User Testing Protocols & Usability Heuristics' },
          { title: 'Feedback Capture Grids & Iterative Refinement' },
          { title: 'Addressing Ergonomic and UI/UX Challenges' },
          { title: 'Storytelling & Pitching Design Solutions to Stakeholders' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 307',
    subject_name: 'Leadership and Management Skills',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Leadership Foundations and Styles',
        description: 'Leadership concepts, traits, behavioral models, situational leadership, motivation, effective communication, negotiation and networking.',
        topics: [
          { title: 'Leadership Traits, Behaviors & Leadership Theories' },
          { title: 'Situational & Contingency Leadership Models' },
          { title: 'Motivating Followers & Coaching for High Performance' },
          { title: 'Strategic Negotiation and Executive Networking' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Managerial Competencies and Self-Leadership',
        description: 'Planning, team coordination, conflict management, talent delegation, self-awareness, introspection, emotional regulation, business plan pitch.',
        topics: [
          { title: 'Delegation, Accountability and Conflict Management' },
          { title: 'Self-Awareness, Emotional Regulation & Self-Leadership' },
          { title: 'Entrepreneurial Competencies & Opportunity Validation' },
          { title: 'Crafting Business Pitches & Executive Presentations' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Innovative Leadership and Human-Centric Systems',
        description: 'Social and emotional intelligence, synergy of human and artificial intelligence, human-centric design thinking, agile leadership.',
        topics: [
          { title: 'Social Intelligence & Relationship Management' },
          { title: 'Harmonizing Human Judgment with Artificial Intelligence' },
          { title: 'Agile & Adaptive Leadership in Volatile Environments' },
          { title: 'Building Innovation Cultures in Organizations' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Ethics, Integrity and Personal Finance Leadership',
        description: 'Moral codes in leadership, personal ethics, managing personal finance: Budgeting, savings, investing, time value of money, wealth planning.',
        topics: [
          { title: 'Ethical Decision Making & Moral Codes in Leadership' },
          { title: 'Personal Finance Fundamentals: Budgeting & Expense Control' },
          { title: 'Investment Vehicles: Equities, Bonds, Mutual Funds & Real Estate' },
          { title: 'Long-Term Financial Independence & Wealth Planning' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 309',
    subject_name: 'Summer Internship Project Report',
    year_number: 3,
    semester_number: 5,
    credits: 6,
    hours: 60,
    category: 'Internship / Project',
    units: [
      {
        unit_number: 1,
        unit_title: 'Organizational Immersion and Business Due Diligence',
        description: 'Eight-week practical corporate internship in an approved organization, understanding business model, organization structure and competitive position.',
        topics: [
          { title: 'Corporate Induction & Departmental Operations Study' },
          { title: 'Industry Environment & Competitor Benchmarking' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Problem Diagnosis and Research Design',
        description: 'Formulating the business problem, setting research objectives, secondary and primary data collection within the host enterprise.',
        topics: [
          { title: 'Diagnostic Problem Statement Formulation' },
          { title: 'Data Collection Methodology in Enterprise Context' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Managerial Analysis and Financial Evaluation',
        description: 'Financial and non-financial performance analysis, marketing strategies, HR practices, operational workflows and analytics.',
        topics: [
          { title: 'Financial & Functional Performance Metrics Analysis' },
          { title: 'Identifying Operational Gaps & Inefficiencies' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Project Report Compilation and Viva Voce',
        description: 'Preparation of formal 60-page internship project report, recommendations, executive summary, presentation and defense before internal/external examiners.',
        topics: [
          { title: 'Report Writing According to Academic Guidelines' },
          { title: 'Actionable Managerial Recommendations & Viva Voce Defense' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER V — MARKETING SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 321',
    subject_name: "Consumer's Buying Behaviour",
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Marketing Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Forces Driving Consumer Behavior and Segmentation',
        description: 'Importance of consumer behavior, strategic marketing implications, Indian consumer market landscape, segmentation strategies and criteria.',
        topics: [
          { title: 'Consumer Behavior Principles & Strategic Marketing Alignment' },
          { title: 'Evolution of Indian Consumer Demographics & Lifestyle' },
          { title: 'Bases of Segmentation & Targeting Criteria' },
          { title: 'Positioning Mapping & Consumer Mindshare' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Consumer Psychology, Needs and Personality',
        description: 'Motivational research, hierarchy of needs, personality theories (Freudian, Neo-Freudian, Trait), brand personality, self-concept.',
        topics: [
          { title: 'Motivation Theories & Consumer Needs Arousal' },
          { title: 'Personality Theories & Consumer Behavior Correlation' },
          { title: 'Brand Personality Dimensions & Self-Image Congruence' },
          { title: 'Motivational Research Techniques (Projective Methods)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Psychographics, Perception and Attitude Formation',
        description: 'VALS framework, consumer perception, perceptual mapping, attitude components (Tri-component model), attitude change strategies, learning theories.',
        topics: [
          { title: 'Psychographic Profiling & SRI VALS Framework' },
          { title: 'Perceptual Selection, Organization & Interpretation' },
          { title: 'Attitude Formation, Tri-Component Model & Measurement' },
          { title: 'Cognitive Dissonance & Behavioral Learning Theories' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Diffusion of Innovations and Consumer Decision Making',
        description: 'Diffusion process, adopter categories, models of consumer decision making (Howard-Sheth, Nicosia, Engel-Blackwell), post-purchase evaluation, CRM.',
        topics: [
          { title: 'Diffusion of Innovations & Adopter Categories' },
          { title: 'Comprehensive Decision Making Models (Howard-Sheth)' },
          { title: 'Post-Purchase Evaluation & Customer Delight' },
          { title: 'B2B Buying Behavior vs B2C Consumer Behavior' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 322',
    subject_name: 'Retail Management',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Marketing Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Retailing and Retail Consumer',
        description: 'Definition, functions of retailing, significance of retail industry, factors influencing retail shopper, consumer decision making in retail, retail research.',
        topics: [
          { title: 'Functions, Significance & Dynamics of Retailing' },
          { title: 'Retail Consumer Behavior & Shopper Decision Process' },
          { title: 'Evolution of Organized Retailing in India' },
          { title: 'Market Research Techniques for Retailers' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Retail Formats and Store Location Strategy',
        description: 'Theories of retail development (Wheel of Retailing, Retail Accordion, Life Cycle), store classification, store location selection, trade area analysis.',
        topics: [
          { title: 'Theories of Retail Development (Wheel of Retailing, Accordion)' },
          { title: 'Store Formats: Supermarkets, Hypermarkets, Departmental, Convenience' },
          { title: 'Choosing Store Location: Types, Steps & Evaluation' },
          { title: 'Trading Area Analysis & Gravity Models (Reilly, Huff)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Retail Merchandising, Store Design and Layout',
        description: 'Merchandising planning, buying systems, store layout (grid, racetrack, freeform), visual merchandising, planograms, atmospherics, private label brands.',
        topics: [
          { title: 'Merchandise Planning, Assortment & Open-to-Buy Systems' },
          { title: 'Store Layouts (Grid, Racetrack, Free-Flow) & Circulation' },
          { title: 'Visual Merchandising, Planograms & Window Displays' },
          { title: 'Private Label Strategies vs National Brands' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Emerging Trends, E-Tailing and Omnichannel Retailing',
        description: 'Organized retail growth in India, drivers of change, e-tailing models, omnichannel strategy, retail technology (RFID, self-checkout), global challenges.',
        topics: [
          { title: 'Organized vs Unorganized Retailing in India' },
          { title: 'E-Tailing Business Models & Last-Mile Delivery Challenges' },
          { title: 'Omnichannel Retailing Integration' },
          { title: 'Global Retail Trends, Supply Chain Tech & Sustainable Retail' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 323',
    subject_name: 'Sales and Distribution Management',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Marketing Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Sales Management and Personal Selling',
        description: 'Nature and importance, emerging trends, personal selling process (prospecting, pre-approach, approach, presentation, handling objections, closing), relationship selling.',
        topics: [
          { title: 'Role & Objectives of Sales Management' },
          { title: 'Personal Selling Process: Step-by-Step Methodology' },
          { title: 'Handling Objections & Negotiation Tactics' },
          { title: 'Relationship Selling vs Transactional Selling' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Sales Planning, Territory Design and Quotas',
        description: 'Sales forecasting methods, sales organization structures, territory design principles, routing plans, sales quotas (volume, financial, activity).',
        topics: [
          { title: 'Sales Forecasting Qualitative & Quantitative Methods' },
          { title: 'Sales Force Organization Structures' },
          { title: 'Sales Territory Design & Routing Procedures' },
          { title: 'Sales Quotas: Types, Setting Quotas & Administration' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Sales Force Management, Motivation and Compensation',
        description: 'Recruitment and selection of sales personnel, sales training methods, compensation plans (salary, commission, combination), motivation, performance evaluation.',
        topics: [
          { title: 'Sales Job Analysis, Recruitment & Selection' },
          { title: 'Sales Training Needs, Content & Effectiveness' },
          { title: 'Sales Force Compensation Plans & Incentive Schemes' },
          { title: 'Sales Force Performance Evaluation & Sales Audits' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Distribution Channels and Logistics Management',
        description: 'Channel functions, channel design, channel conflict and resolution, physical distribution, order processing, warehousing, inventory and transportation.',
        topics: [
          { title: 'Channel Design Decisions & Selection of Intermediaries' },
          { title: 'Channel Power, Conflict Types & Resolution Mechanisms' },
          { title: 'Physical Distribution System & Warehousing Decisions' },
          { title: 'Logistics Optimization & Reverse Logistics' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER V — FINANCE SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 331',
    subject_name: 'Financial Markets & Institutions',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Finance Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Structure of Indian Financial System and Regulators',
        description: 'Overview of Indian financial system, regulatory bodies (RBI, SEBI, IRDA, PFRDA), commercial banking system, NPAs, risk management, universal banking, NBFCs.',
        topics: [
          { title: 'Indian Financial Architecture & Economic Linkages' },
          { title: 'Regulatory Mandates: RBI, SEBI, IRDAI and PFRDA' },
          { title: 'Commercial Banks, Asset Quality & NPA Resolution' },
          { title: 'Non-Banking Financial Companies (NBFCs) & Microfinance' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Financial Markets in India',
        description: 'Money market vs capital market, primary market operations, public issue process (IPO, FPO, OFS), book building, underwriting, SEBI ICDR regulations.',
        topics: [
          { title: 'Money Market vs Capital Market Architecture' },
          { title: 'Primary Market Issuance: IPOs, FPOs & Rights Issues' },
          { title: 'Book Building Mechanism & Pricing of Securities' },
          { title: 'Intermediaries in Primary Issues: Merchant Bankers & Underwriters' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Secondary Capital Markets and Stock Exchanges',
        description: 'Stock exchanges in India (BSE, NSE), trading mechanisms, order types, screen-based trading, clearing and settlement (NSCCL), depository system (NSDL, CDSL).',
        topics: [
          { title: 'Trading Mechanism on NSE & BSE Platforms' },
          { title: 'Clearing and Settlement Process (T+1 Cycle) & NSCCL' },
          { title: 'Depository System, Dematerialization & NSDL/CDSL Operations' },
          { title: 'Stock Indices (Nifty 50, Sensex) & Commodity Exchanges' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Money Markets and Debt Markets',
        description: 'Money market instruments: Treasury bills, commercial paper, certificates of deposit, call money, repo and reverse repo. Corporate debt market, mutual fund schemes.',
        topics: [
          { title: 'Treasury Bills, Commercial Papers & Certificates of Deposit' },
          { title: 'Call Money Market & Liquidity Adjustment Facility (Repo/Reverse Repo)' },
          { title: 'Corporate Bond Market Infrastructure in India' },
          { title: 'Mutual Fund Classifications, NAV & Regulatory Framework' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 332',
    subject_name: 'Essentials of Financial Investments',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Finance Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Investment Environment and Asset Classes',
        description: 'Investment vs speculation vs gambling, investment process, risk-return tradeoff, financial assets (equity, bonds, money market instruments), active vs passive investing.',
        topics: [
          { title: 'Concepts of Investment, Speculation & Arbitrage' },
          { title: 'The Investment Decision Process & Asset Allocation' },
          { title: 'Risk-Return Tradeoff & Investment Objectives' },
          { title: 'Active vs Passive Investment Strategies' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Risk and Return Analysis',
        description: 'Expected return, holding period return, portfolio return, systematic vs unsystematic risk, standard deviation, beta calculation, diversification benefits.',
        topics: [
          { title: 'Calculating Historical and Expected Returns' },
          { title: 'Total Risk: Standard Deviation and Variance Computations' },
          { title: 'Systematic vs Unsystematic Risk Breakdown' },
          { title: 'Beta Coefficient & Portfolio Risk Reduction' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Fundamental and Technical Security Analysis',
        description: 'EIC (Economy, Industry, Company) analysis framework, financial ratio screening, technical analysis tools (charts, moving averages, RSI, MACD), Efficient Market Hypothesis.',
        topics: [
          { title: 'Economy-Industry-Company (EIC) Analysis Framework' },
          { title: 'Technical Analysis Principles, Candlesticks & Chart Patterns' },
          { title: 'Technical Indicators (RSI, Moving Averages, MACD)' },
          { title: 'Efficient Market Hypothesis (Weak, Semi-Strong, Strong)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Security Valuation and Portfolio Analysis',
        description: 'Equity valuation (Dividend Discount Model, P/E multiples), bond valuation (YTM, duration), Markowitz portfolio theory, Capital Asset Pricing Model (CAPM).',
        topics: [
          { title: 'Dividend Discount Models (Zero Growth, Constant, Multi-Stage)' },
          { title: 'Price-Earnings (P/E) & Relative Valuation Multiples' },
          { title: 'Bond Valuation, Yield to Maturity (YTM) & Duration' },
          { title: 'Markowitz Efficient Frontier & CAPM Pricing' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 333',
    subject_name: 'Fundamentals of Stock Trading',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Finance Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Basics of Investment and Securities',
        description: 'Investment concepts, principles of sound investment, direct vs indirect modes, types of securities (equities, preference shares, debentures, government bonds).',
        topics: [
          { title: 'Characteristics of Equities, Bonds and Hybrids' },
          { title: 'Government Securities (G-Secs) & State Development Loans' },
          { title: 'Principles of Sound Portfolio Construction' },
          { title: 'Investment Decision Workflow for Retail Traders' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Indian Securities Market Operations',
        description: 'Primary and secondary markets, Over-The-Counter (OTC) vs exchange traded, IPO and FPO procedures, offer for sale (OFS), pricing methods: Fixed price vs book building.',
        topics: [
          { title: 'Primary Market Issuance & Listing Guidelines' },
          { title: 'IPO Subscription Mechanism & Allotment Rules' },
          { title: 'Offer for Sale (OFS) vs Qualified Institutional Placement (QIP)' },
          { title: 'Book Building Process and Price Discovery' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Online Security Trading Mechanism',
        description: 'NSE and BSE trading platforms, order types (market, limit, stop-loss), bid-ask spread, tick size, circuit breakers, price bands, risk management systems.',
        topics: [
          { title: 'Order Types: Market, Limit, Stop-Loss & Bracket Orders' },
          { title: 'Bid-Ask Spread, Market Depth & Order Matching Engine' },
          { title: 'Circuit Breakers (Index & Stock-Specific) & Price Bands' },
          { title: 'Margin Trading, Pay-in/Pay-out & Settlement Cycle' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Mutual Funds and Exchange Traded Funds (ETFs)',
        description: 'Structure of mutual funds (Sponsor, AMC, Trustee, Custodian), types of funds (equity, debt, hybrid, ELSS, index), ETF trading, direct vs regular plans, SIPs.',
        topics: [
          { title: 'Three-Tier Architecture of Indian Mutual Funds' },
          { title: 'Scheme Classifications: Large-Cap, Debt, Hybrid & ELSS' },
          { title: 'Exchange Traded Funds (ETFs) Mechanics & Advantages' },
          { title: 'Systematic Investment Plans (SIP) & Performance Evaluation' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER V — HR SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 341',
    subject_name: 'Leadership and Team Effectiveness',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'HR Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Leadership Concepts and Components',
        description: 'Leadership definition, myths about leadership, triad of leader, followers, and situation; How leadership develops through education and experience.',
        topics: [
          { title: 'Leadership Definition, Dimensions & Modern Myths' },
          { title: 'The Triad: Leader, Follower & Situation Dynamics' },
          { title: 'Developing Leadership Competencies through Experiential Learning' },
          { title: 'Power, Authority and Influence Tactics' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Focus on the Leader: Power, Traits and Behaviors',
        description: 'Power and influence sources, leadership values and ethics, trait theories, behavioral theories, team effectiveness and team norms.',
        topics: [
          { title: 'Sources of Power (Legitimate, Reward, Coercive, Referent, Expert)' },
          { title: 'Values, Authenticity and Ethical Leadership' },
          { title: 'Behavioral Leadership Studies (Ohio State, Michigan)' },
          { title: 'Establishing High-Performance Team Norms' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Focus on Followers: Motivation and Group Dynamics',
        description: 'Follower motivation, satisfaction and performance, determinants of group behavior, team building process, team formation models, evaluation.',
        topics: [
          { title: 'Followership Styles and Dynamic Partnerships' },
          { title: 'Determinants of Team Cohesion & Social Loafing' },
          { title: 'Team Building Lifecycle & Diagnostic Evaluations' },
          { title: 'Effective Team Characteristics in Cross-Cultural Settings' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Focus on the Situation and Conflict Management',
        description: 'Situational characteristics, contingency theories, adaptive leadership, team conflict causes, conflict resolution strategies, negotiation in teams.',
        topics: [
          { title: 'Situational Leadership Theories (Hersey-Blanchard, Path-Goal)' },
          { title: 'Diagnosing Team Conflicts: Task vs Relationship' },
          { title: 'Conflict Resolution Styles (Thomas-Kilmann Model)' },
          { title: 'Facilitating Difficult Conversations and Consensus' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 342',
    subject_name: 'Human Resource Development',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'HR Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'HRD Conceptual Framework and Systems',
        description: 'HRD concept, importance, benefits and distinction from HRM, focus of HRD systems, HRD structure, management development methods.',
        topics: [
          { title: 'HRD Philosophy, Goals and Strategic Alignment' },
          { title: 'HRD vs HRM: Structural & Philosophical Differences' },
          { title: 'Sub-systems of Human Resource Development' },
          { title: 'Executive and Management Development Frameworks' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Potential Appraisal and Training Interventions',
        description: 'Potential appraisal objectives, assessment centers, training needs assessment, designing training programs, Kirkpatrick evaluation model.',
        topics: [
          { title: 'Potential Appraisal Systems & Assessment Center Design' },
          { title: 'Training Needs Identification at Organization, Task & Person Levels' },
          { title: 'Instructional Design & Training Delivery Methodologies' },
          { title: 'Kirkpatrick Four-Level Training Evaluation Model' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Job Enrichment and Quality Circles',
        description: 'Job enrichment principles and steps, job redesign, hurdles, Quality Circles concept, structure, problem solving techniques, QC in Indian industry.',
        topics: [
          { title: 'Job Enrichment and Job Redesign Principles' },
          { title: 'Quality Circles: Philosophy, Organization & Problem Solving' },
          { title: 'Employee Involvement & Suggestion Schemes' },
          { title: 'Quality Circles Experiences in Indian Manufacturing' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Human Resource Accounting and Stress Management',
        description: 'HRA introduction, scope, valuation models, career management and planning, workplace stress sources, consequences, stress management strategies.',
        topics: [
          { title: 'Human Resource Accounting (HRA) Models & Valuation' },
          { title: 'Career Planning Stages & Career Anchors' },
          { title: 'Workplace Stressors, Burnout & Coping Mechanisms' },
          { title: 'Employee Assistance Programs (EAP) & Well-being' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 343',
    subject_name: 'Manpower Planning Recruitment and Selection',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'HR Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Human Resource Planning (HRP)',
        description: 'Meaning, objectives, importance, prerequisites, barriers to HRP, macroeconomic and microeconomic factors influencing manpower planning.',
        topics: [
          { title: 'Objectives, Need and Significance of HRP' },
          { title: 'Barriers and Challenges in Manpower Planning' },
          { title: 'Environmental Factors Influencing Manpower Demand' },
          { title: 'Integrating Manpower Planning with Corporate Strategy' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'HRP Process and Forecasting Methodologies',
        description: 'Demand forecasting (Delphi, trend analysis, ratio analysis), supply forecasting (Markov analysis, replacement charts), HR programming and HR audit.',
        topics: [
          { title: 'Manpower Demand Forecasting: Qualitative & Quantitative' },
          { title: 'Internal and External Supply Forecasting Models' },
          { title: 'Manpower Balancing: Surplus and Shortage Actions' },
          { title: 'Human Resource Auditing Protocols and Metrics' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Job Analysis and Job Specifications',
        description: 'Job analysis concepts, methods of data collection, preparing Job Descriptions (JD) and Job Specifications (JS), job performance standards.',
        topics: [
          { title: 'Job Analysis Methods: Observation, Interview, PAQ' },
          { title: 'Drafting Actionable Job Descriptions (JD)' },
          { title: 'Formulating Job Specifications (JS) and Competencies' },
          { title: 'Establishing Job Performance Standards' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Job Design, Modern Sourcing and Selection',
        description: 'Job design approaches (rotation, enlargement, enrichment), Job Characteristics Model, modern sourcing channels, selection testing, psychometrics.',
        topics: [
          { title: 'Job Characteristics Model (Hackman & Oldham)' },
          { title: 'Job Design Approaches: Rotation, Enlargement & Enrichment' },
          { title: 'Digital Recruitment Sourcing & Campus Hiring' },
          { title: 'Psychometric Testing, Assessment Centers & Selection Matrix' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER V — BUSINESS ANALYTICS SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 351',
    subject_name: 'Descriptive Business Analytics',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Analytics Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Statistics and Spreadsheet Modeling',
        description: 'Overview, managerial applications of statistics, Excel environment, statistical functions, Data Analysis ToolPak add-in.',
        topics: [
          { title: 'Role of Descriptive Analytics in Business Strategy' },
          { title: 'Excel Advanced Formulas and Spreadsheet Navigation' },
          { title: 'Installing and Applying the Data Analysis ToolPak' },
          { title: 'Data Cleaning and Handling Outliers' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Data Analysis, Frequency Distributions and Visual Summaries',
        description: 'Scales of measurement, frequency distributions, measures of central tendency, dispersion, variance, skewness, kurtosis.',
        topics: [
          { title: 'Nominal, Ordinal, Interval & Ratio Data Properties' },
          { title: 'Frequency Distributions, Histograms & Ogives' },
          { title: 'Mean, Median, Mode, Variance & Standard Deviation' },
          { title: 'Box-and-Whisker Plots & Shape Analysis (Skewness/Kurtosis)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Probability Concepts and Rules',
        description: 'Classical, relative frequency and subjective probability, marginal, joint and conditional probability, independence.',
        topics: [
          { title: 'Sample Spaces, Events & Fundamental Probability Laws' },
          { title: 'Marginal, Conditional and Joint Probabilities' },
          { title: 'Statistical Independence & Contingency Tables' },
          { title: 'Business Applications of Probability Models' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Probability Distributions and KDD Process',
        description: 'Discrete (Binomial, Poisson) and continuous (Normal) distributions. Introduction to data mining, Knowledge Discovery in Databases (KDD) process.',
        topics: [
          { title: 'Binomial and Poisson Distribution Calculations' },
          { title: 'Normal Curve Properties & Standardized Z-Scores' },
          { title: 'Knowledge Discovery in Databases (KDD) Lifecycle' },
          { title: 'Data Warehousing Concepts & ETL Pipelines' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 352',
    subject_name: 'Predictive Business Analytics',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Analytics Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Dimension Reduction and Factor Analysis',
        description: 'Introduction to dimension reduction, Principal Component Analysis (PCA), exploratory factor analysis, factor rotation, eigenvalues.',
        topics: [
          { title: 'Need for Dimension Reduction in High-Dimensional Data' },
          { title: 'Principal Component Analysis (PCA) Mathematical Formulation' },
          { title: 'Exploratory vs Confirmatory Factor Analysis' },
          { title: 'Factor Loadings, Varimax Rotation & Scree Plots' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Hypothesis Testing and Inferences',
        description: 'Hypothesis formulation, Type I and Type II errors, single mean and two-mean tests, F-distribution, Chi-square tests, One-way and Two-way ANOVA.',
        topics: [
          { title: 'Null and Alternative Hypotheses & p-Value Inferences' },
          { title: 'One-Sample and Independent Two-Sample t-Tests' },
          { title: 'Chi-Square Test of Independence & Contingency Testing' },
          { title: 'One-Way and Two-Way Analysis of Variance (ANOVA)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Cluster Analysis and Unsupervised Learning',
        description: 'Distance metrics, hierarchical clustering (Ward method, dendrograms), K-means clustering, K-Nearest Neighbors (KNN) algorithm.',
        topics: [
          { title: 'Euclidean and Manhattan Distance Metrics' },
          { title: 'Hierarchical Clustering & Dendrogram Interpretation' },
          { title: 'K-Means Clustering: Centroid Selection & Silhouette Score' },
          { title: 'K-Nearest Neighbors (KNN) for Classification' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Time Series Forecasting and Regression Modeling',
        description: 'Time series components (trend, seasonal, cyclical, irregular), moving averages, exponential smoothing, simple/multiple regression, logistic regression.',
        topics: [
          { title: 'Time Series Decomposition (Additive vs Multiplicative)' },
          { title: 'Moving Averages & Exponential Smoothing Models' },
          { title: 'Multiple Linear Regression & Multicollinearity (VIF)' },
          { title: 'Binary Logistic Regression & Odds Ratio Inferences' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 353',
    subject_name: 'Data Analysis Using R Programming',
    year_number: 3,
    semester_number: 5,
    credits: 3,
    hours: 30,
    category: 'Analytics Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Data Analysis and R Environment',
        description: 'Overview of analytics, structured vs unstructured data, installing R and RStudio, basic syntax, data types, vectors, matrices, data frames, lists.',
        topics: [
          { title: 'R and RStudio IDE Setup and Workspace Configuration' },
          { title: 'Data Types: Numeric, Character, Logical, Factors' },
          { title: 'Data Structures: Vectors, Matrices, Lists, Data Frames' },
          { title: 'Basic Operators, Indexing & Slicing' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Data Wrangling and R Packages',
        description: 'Reading data from CSV, Excel, web, subsetting, managing missing values, dplyr verbs (filter, select, mutate, summarize, arrange), tidyr.',
        topics: [
          { title: 'Importing & Exporting Datasets (readr, readxl)' },
          { title: 'Data Wrangling with dplyr (filter, select, mutate)' },
          { title: 'Data Reshaping with tidyr (pivot_longer, pivot_wider)' },
          { title: 'Handling Missing Values and Data Cleaning' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Data Visualization with ggplot2',
        description: 'Grammar of graphics, creating scatter plots, bar charts, histograms, box plots, line charts, faceting, customizing themes and legends.',
        topics: [
          { title: 'Grammar of Graphics & ggplot2 Aesthetic Mapping' },
          { title: 'Geometries: geom_point, geom_line, geom_bar, geom_boxplot' },
          { title: 'Faceting (facet_wrap, facet_grid) & Multi-Panel Visuals' },
          { title: 'Custom Themes, Palettes & Exporting Publication Visuals' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Statistical Modeling and Machine Learning in R',
        description: 'Descriptive stats, t-tests, ANOVA, linear regression (lm), logistic regression (glm), decision trees (rpart), random forests, R Markdown reports.',
        topics: [
          { title: 'Summary Statistics and Correlation in R' },
          { title: 'Linear Regression Modeling & Residual Diagnostics' },
          { title: 'Classification with Decision Trees (rpart)' },
          { title: 'Automated Reporting with R Markdown and Knitr' },
        ],
      },
    ],
  },

  // ============================================================================
  // THIRD YEAR — SEMESTER VI (Academic Session 2024-25)
  // ============================================================================
  {
    subject_code: 'NBA 302',
    subject_name: 'Strategic Management',
    year_number: 3,
    semester_number: 6,
    credits: 4,
    hours: 40,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Basics of Strategic Management and Strategic Intent',
        description: 'Evolution of strategic management, schools of thought, hierarchy of strategic intent: Vision, Mission, Business Goals and Objectives formulation.',
        topics: [
          { title: 'Concepts, Phases and Schools of Strategic Management' },
          { title: 'Hierarchy of Strategic Intent: Vision, Mission & Goals' },
          { title: 'Formulation of Mission Statements & Corporate Values' },
          { title: 'Role of Top Management and Strategic Decision Makers' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Environmental and Organizational Appraisal',
        description: 'External environmental appraisal, Porter’s Five Forces model, industry analysis, internal organizational appraisal, VRIO framework, value chain analysis.',
        topics: [
          { title: 'External Environmental Scanning & Industry Matrix' },
          { title: 'Porter’s Five Forces Model of Competition' },
          { title: 'Internal Resources Appraisal & VRIO Framework' },
          { title: 'Value Chain Analysis & Core Competencies' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Corporate and Business Level Strategy Formulation',
        description: 'Generic strategies (cost leadership, differentiation, focus), corporate growth strategies (integration, diversification, M&A), portfolio matrices (BCG, GE-McKinsey).',
        topics: [
          { title: 'Porter’s Generic Strategies (Cost, Differentiation, Focus)' },
          { title: 'Corporate Growth Strategies: Integration & Diversification' },
          { title: 'Mergers, Acquisitions and Strategic Alliances' },
          { title: 'Portfolio Analysis: BCG Growth-Share Matrix & GE 9-Cell' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Strategy Implementation and Evaluation Control',
        description: 'Structural, behavioral, functional and operational implementation; McKinsey 7S framework; Strategic and operational control; Balanced Scorecard.',
        topics: [
          { title: 'Strategy Implementation Challenges & McKinsey 7S Model' },
          { title: 'Organizational Structure, Culture & Strategy Alignment' },
          { title: 'Techniques of Strategic Control and Operational Review' },
          { title: 'The Balanced Scorecard Approach to Performance Management' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 304',
    subject_name: 'Universal Human Values',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Value Education',
        description: 'Definition, need, basic guidelines, content and process of value education; Self-exploration as the mechanism; Happiness and prosperity.',
        topics: [
          { title: 'Concept and Need for Value Education in Management' },
          { title: 'Process of Self-Exploration: Natural Acceptance' },
          { title: 'Continuous Happiness and Prosperity as Universal Desires' },
          { title: 'Distinguishing Needs of Self (I) from Physical Facilities' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Harmony in the Human Being',
        description: 'Human being as co-existence of Self and Body, needs of Self (knowing, assuming, recognizing, fulfilling) vs needs of Body, harmony of Self with Body.',
        topics: [
          { title: 'Co-existence of Self (I) and Body' },
          { title: 'Needs of the Self (Conscious) vs Needs of the Body (Material)' },
          { title: 'Activities in the Self: Desire, Thought, Expectation' },
          { title: 'Sanyam (Self-Control) and Swasthya (Health)' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Harmony in Family, Society and Nature',
        description: 'Values in relationships (Trust, Respect, Affection, Gratitude, Love), Comprehensive Human Goal, Four orders in nature (material, plant, animal, human).',
        topics: [
          { title: 'Values in Human-to-Human Relationships (Trust & Respect)' },
          { title: 'Comprehensive Human Goals (Fearlessness, Abundance, Co-existence)' },
          { title: 'Interconnectedness and Mutual Fulfillment in Nature' },
          { title: 'The Four Orders of Existence and Ecological Harmony' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Social Ethics and Universal Human Order',
        description: 'Ethical human conduct, human values in professional life, holistic alternative, transitioning toward human-centric social and economic order.',
        topics: [
          { title: 'Ethical Human Conduct and Professional Competence' },
          { title: 'Deficiencies in Contemporary Economics & Technological Systems' },
          { title: 'Holistic Technologies, Production Systems and Management Models' },
          { title: 'Vision for Universal Human Order (Sarvabhauma Vyavastha)' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 306',
    subject_name: 'Managing E-Commerce and Digital Communication',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Core',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Digital Marketing and E-Commerce',
        description: 'Digital marketing meaning, scope, comparison with traditional marketing, consumer journey in the virtual world, Self-Service Technologies (SSTs).',
        topics: [
          { title: 'Evolution from Traditional to Digital Commerce' },
          { title: 'The Digital Consumer Journey and Zero Moment of Truth' },
          { title: 'B2B, B2C, C2C & D2C E-Commerce Architectures' },
          { title: 'Self-Service Technologies and Frictionless Checkout' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Online Buyer Behavior and Web User Experience',
        description: 'Online marketing mix, managing customer experience, website wireframing, site structure, electronic word-of-mouth (e-WOM), conversion optimization.',
        topics: [
          { title: 'Online Customer Experience (CX) & UI/UX Design' },
          { title: 'Electronic Word-of-Mouth (e-WOM) & Social Proof' },
          { title: 'Website Architecture, Landing Pages & Usability' },
          { title: 'Conversion Rate Optimization (CRO) & User Flows' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Digital Promotion, Search Marketing and Content',
        description: 'Search Engine Optimization (SEO on-page and off-page), Search Engine Marketing (SEM / PPC), email marketing campaigns, viral marketing, content marketing.',
        topics: [
          { title: 'Search Engine Optimization (SEO) On-Page & Technical Factors' },
          { title: 'Pay-Per-Click Advertising (Google Ads, Bid Strategies)' },
          { title: 'Content Marketing Strategy & Inbound Methodologies' },
          { title: 'Email Automation, Segmentation and Deliverability' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Social Media, Mobile Commerce and E-Tailing',
        description: 'Social media campaign design, mobile marketing, app marketing, e-tailing dynamics, show-rooming vs web-rooming, role of aggregators (Amazon, Flipkart).',
        topics: [
          { title: 'Social Media Advertising (Meta, LinkedIn, YouTube Ads)' },
          { title: 'Mobile Commerce, In-App Marketing & Push Notifications' },
          { title: 'E-Tailing Platforms, Marketplace Aggregators & Fulfillment' },
          { title: 'Showrooming vs Webrooming & Omnichannel Synergy' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 308',
    subject_name: 'Research Project Report',
    year_number: 3,
    semester_number: 6,
    credits: 5,
    hours: 50,
    category: 'Research Project',
    units: [
      {
        unit_number: 1,
        unit_title: 'Research Formulation and Industry Selection',
        description: 'Independent research project on corporate/business firm/startup, defining the management problem, supervisor allotment, proposal approval.',
        topics: [
          { title: 'Corporate Problem Selection and Proposal Presentation' },
          { title: 'Formulation of Research Objectives and Hypotheses' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Literature Review and Research Methodology',
        description: 'Comprehensive review of literature, identifying research gaps, designing survey instruments, sampling design, primary/secondary data collection.',
        topics: [
          { title: 'Theoretical Literature Synthesis & Conceptual Framework' },
          { title: 'Instrument Design, Pilot Testing & Reliability Analysis' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Data Analysis and Empirical Findings',
        description: 'Data entry, coding, statistical testing using SPSS/Excel/R, hypothesis verification, data presentation in APA-compliant tables and charts.',
        topics: [
          { title: 'Hypothesis Testing & Statistical Inference' },
          { title: 'Data Presentation, Tables and Thematic Findings' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Dissertation Compilation, Recommendations and Viva Voce',
        description: 'Formal dissertation report of minimum 60 pages formatted according to university guidelines, final hard copy submission, viva voce defense.',
        topics: [
          { title: 'Summary, Managerial Implications and Limitations' },
          { title: 'APA Referencing & Formal Defense before Board of Examiners' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER VI — MARKETING SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 324',
    subject_name: 'Digital Marketing',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Marketing Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Digital Marketing Landscape and Strategy',
        description: 'Trends driving shifts to digital marketing, consumer digital journey, digital marketing planning, digital value proposition, competitive analysis online.',
        topics: [
          { title: 'Digital Marketing Ecosystem and Strategic Planning' },
          { title: 'Digital Customer Personas & Micro-Moments' },
          { title: 'Competitive Intelligence Tools & Benchmarking' },
          { title: 'Defining Online Value Propositions (OVP)' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'E-Commerce Marketing and Online Branding',
        description: 'Online marketing mix, digital branding strategies, traffic building, content planning, customer lifecycle management in digital channels.',
        topics: [
          { title: 'Digital Marketing Mix Optimization' },
          { title: 'Online Branding and Reputation Management' },
          { title: 'Traffic Acquisition Channels & Inbound Marketing' },
          { title: 'Content Calendars and Creative Copywriting' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Search, Social and Mobile Campaign Execution',
        description: 'Search marketing (SEO and Google Ads), mobile marketing, video advertising (YouTube), social media campaign management, campaign analytics.',
        topics: [
          { title: 'Search Engine Marketing (PPC) Account Structure' },
          { title: 'Meta Ads Manager: Audience Targeting & Retargeting' },
          { title: 'Video Advertising Campaigns on YouTube & Reels' },
          { title: 'Campaign Performance Metrics (CTR, CPC, CPA, ROAS)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Marketing Analytics, Attribution and ROI',
        description: 'Marketing attribution models, ROI of digital campaigns, evaluating cost effectiveness, digital leadership and transformation.',
        topics: [
          { title: 'Multi-Touch Attribution Models vs Last-Click' },
          { title: 'Measuring Customer Lifetime Value (CLV) Online' },
          { title: 'Evaluating Digital ROI & Marketing Budget Allocation' },
          { title: 'Ethical Digital Practices, Cookie Deprecation & Privacy' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 325',
    subject_name: 'International Marketing',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Marketing Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Global Marketing Overview and EPRG Framework',
        description: 'Definition, scope and challenges, EPRG framework (Ethnocentric, Polycentric, Regiocentric, Geocentric), driving and restraining forces of globalization.',
        topics: [
          { title: 'Scope & Complexities of International Marketing' },
          { title: 'The EPRG Strategic Framework in Multinational Enterprises' },
          { title: 'Driving and Restraining Forces of Global Business' },
          { title: 'International Marketing vs Domestic Marketing Comparison' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'International Business Environment',
        description: 'Political risk assessment, international legal environments, cultural influences (Hofstede dimensions), cultural universals, ethical considerations abroad.',
        topics: [
          { title: 'Political Risk Evaluation & Mitigation Strategies' },
          { title: 'International Legal Systems and Cross-Border Contracts' },
          { title: 'Hofstede Cultural Dimensions & Impact on Consumption' },
          { title: 'Cross-Cultural Communication & Non-Verbal Protocols' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Global Market Entry Strategies and Research',
        description: 'International marketing research, market selection, entry modes: Exporting, licensing, franchising, joint ventures, strategic alliances, wholly owned subsidiaries.',
        topics: [
          { title: 'International Market Screening & Selection Criteria' },
          { title: 'Exporting, Piggybacking and Counter-Trade' },
          { title: 'Contractual Modes: Licensing & International Franchising' },
          { title: 'Joint Ventures, Strategic Alliances & Foreign Direct Investment' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'International Product, Pricing and Channel Strategies',
        description: 'Product standardization vs adaptation, global branding, international pricing strategies (transfer pricing, dumping, currency fluctuations), global logistics.',
        topics: [
          { title: 'Standardization vs Adaptation in Product Strategy' },
          { title: 'Global Brand Architecture & Counterfeiting Prevention' },
          { title: 'International Pricing Escalation, Currency Risk & Incoterms' },
          { title: 'Global Distribution Networks & Export Logistics Documentation' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 326',
    subject_name: 'Social Media and Web Analytics',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Marketing Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Social Media and Web Analytics Foundations',
        description: 'Social media landscape, SMA in organizations, web analytics definitions, process, key terms: Hits, page views, visits, bounce rate, categories.',
        topics: [
          { title: 'Social Media Analytics Landscape & Need' },
          { title: 'Core Web Analytics Terminology: Sessions, Users, Bounces' },
          { title: 'On-Site vs Off-Site Web Analytics Frameworks' },
          { title: 'Key Performance Indicators (KPIs) for Web Strategy' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Network Fundamentals and Data Collection Methods',
        description: 'Social network perspective (nodes, ties, centrality), capturing data: Log files, JavaScript tags, cookies, packet sniffing, panel measurements.',
        topics: [
          { title: 'Network Fundamentals: Nodes, Ties, Centrality & Influencers' },
          { title: 'Web Data Collection Mechanisms: Tags, Cookies, Server Logs' },
          { title: 'Data Cleaning and Managing Tracking Discrepancies' },
          { title: 'Competitive Intelligence using Search Engine Data' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Web Metrics, Experimentation and NLP for Micro-Text',
        description: 'Traffic sources, campaign tagging (UTMs), A/B testing, multivariate testing, online surveys, NLP techniques for social listening and sentiment analysis.',
        topics: [
          { title: 'Traffic Source Attribution & Campaign Tagging (UTM Parameters)' },
          { title: 'A/B Testing Methodologies & Hypothesis Verification' },
          { title: 'Natural Language Processing (NLP) for Sentiment Analysis' },
          { title: 'Social Listening Tools and Trend Detection' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Platform Analytics (Meta, Google Analytics) and Privacy',
        description: 'Facebook Insights, Instagram/LinkedIn analytics, Google Analytics (GA4), reporting dashboards, performance concerns, user privacy and regulations.',
        topics: [
          { title: 'Meta Business Suite & Instagram Analytics Deep Dive' },
          { title: 'Google Analytics 4 (GA4): Events, Funnels & Explorations' },
          { title: 'Building Automated Executive Dashboards (Looker Studio)' },
          { title: 'Data Privacy Regulations (GDPR, DPDP Act) & Cookie Consent' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER VI — FINANCE SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 334',
    subject_name: 'Digital Finance',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Finance Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Digital Transformation of Finance and FinTech',
        description: 'Brief history of financial innovation, digitization of services, FinTech typology, collaboration between traditional banks and FinTech startups.',
        topics: [
          { title: 'Evolution and Drivers of Financial Innovation' },
          { title: 'FinTech Typology: Payments, Lending, WealthTech, InsurTech' },
          { title: 'Open Banking, APIs & Banking-as-a-Service (BaaS)' },
          { title: 'Collaboration Models: Incumbents vs FinTech Startups' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Digital Payment Systems and Infrastructure',
        description: 'Payment system evolution, retail vs wholesale payments, RTGS, NEFT, IMPS, UPI ecosystem, digital wallets, RBI regulatory guidelines on digital payments.',
        topics: [
          { title: 'Payment Systems Architecture: RTGS, NEFT, IMPS' },
          { title: 'The Unified Payments Interface (UPI) Revolution in India' },
          { title: 'Digital Wallets, Payment Gateways & Aggregators' },
          { title: 'RBI Regulatory Framework & Customer Protection Guidelines' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Crypto Assets and Blockchain Technology',
        description: 'Blockchain architecture, distributed ledgers, consensus mechanisms, cryptocurrencies (Bitcoin, Ethereum), smart contracts, CBDCs (Digital Rupee).',
        topics: [
          { title: 'Blockchain Foundations: Distributed Ledgers & Consensus' },
          { title: 'Cryptocurrencies as Asset Class & Valuation Challenges' },
          { title: 'Smart Contracts & Decentralized Finance (DeFi) Protocols' },
          { title: 'Central Bank Digital Currencies (CBDC / e-Rupee)' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'FinTech Business Models, AI and Cyber Risk',
        description: 'Alternative credit scoring using Big Data and ML, algorithmic trading, robo-advisory, cybersecurity in finance, systemic risks in digital finance.',
        topics: [
          { title: 'Alternative Credit Scoring using Machine Learning' },
          { title: 'Robo-Advisors & Automated Wealth Management Platforms' },
          { title: 'Algorithmic & High-Frequency Trading Overview' },
          { title: 'Cybersecurity, Fraud Detection & Systemic FinTech Risks' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 335',
    subject_name: 'Personal Finance',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Finance Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Basics of Personal Financial Planning',
        description: 'Financial planning process, financial life cycle, SMART financial goals, budgeting, personal balance sheet, career planning in personal finance.',
        topics: [
          { title: 'Financial Planning Process & Life Cycle Stages' },
          { title: 'Setting SMART Financial Goals (Short, Medium, Long-Term)' },
          { title: 'Personal Net Worth Statement & Cash Flow Budgeting' },
          { title: 'Emergency Fund Sizing & Debt Management Principles' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Managing Insurance Needs and Risk Protection',
        description: 'Life insurance planning, human life value calculation, term insurance, health insurance selection, critical illness riders, motor and home insurance.',
        topics: [
          { title: 'Risk Management Principles & Need for Adequate Coverage' },
          { title: 'Life Insurance: Term Plans vs Traditional Policies' },
          { title: 'Health Insurance: Individual, Floater & Super Top-Up Plans' },
          { title: 'General Insurance: Motor, Property & Liability Protections' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Managing Investments and Wealth Creation',
        description: 'Asset allocation strategy, equity investment through mutual funds, debt funds, fixed income instruments, gold bonds (SGB), tax-saving investments (80C).',
        topics: [
          { title: 'Strategic Asset Allocation & Rebalancing Rules' },
          { title: 'Equity Mutual Funds, Index Funds & Direct Stock Investing' },
          { title: 'Fixed Income Instruments: PPF, EPF, NPS, Bank FDs' },
          { title: 'Tax Planning & Deductions under Old and New Tax Regimes' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Real Estate, Retirement and Estate Planning',
        description: 'Real estate investment, REITs, estimating retirement corpus, pension schemes, wills and power of attorney, nomination, inter-generational wealth transfer.',
        topics: [
          { title: 'Real Estate Investment vs REITs and InvITs' },
          { title: 'Retirement Corpus Estimation & Withdrawal Strategies (SWP)' },
          { title: 'National Pension System (NPS) & Annuity Products' },
          { title: 'Estate Planning: Wills, Trusts, Nomination & Inheritance' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 336',
    subject_name: 'Corporate Finance',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Finance Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Nature of Corporate Finance and Valuation',
        description: 'Scope of financial management, wealth maximization, risk-return tradeoff, time value of money, discounted cash flow valuation modeling.',
        topics: [
          { title: 'Corporate Finance Goals & Shareholder Wealth Maximization' },
          { title: 'Agency Problems, Managerial Compensation & Corporate Control' },
          { title: 'Time Value of Money Applications in Corporate Finance' },
          { title: 'Discounted Cash Flow (DCF) Valuation Framework' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Strategic Investment Decisions and Cost of Capital',
        description: 'Advanced capital budgeting under capital rationing, project risk analysis (sensitivity, scenario, simulation), WACC calculation, hurdle rates.',
        topics: [
          { title: 'Project Appraisal under Capital Rationing Constraints' },
          { title: 'Risk Analysis in Capital Budgeting (Scenario & Simulation)' },
          { title: 'Determining Cost of Capital & Project-Specific Hurdle Rates' },
          { title: 'Adjusted Present Value (APV) Method' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Strategic Financing Decisions and Capital Structure',
        description: 'Capital structure theories, Hamada model for unlevering beta, optimal capital structure determination, corporate restructuring, debt covenants.',
        topics: [
          { title: 'Modigliani-Miller Theorem with Corporate and Personal Taxes' },
          { title: 'Trade-off Theory, Pecking Order Theory & Signaling' },
          { title: 'Hamada Model for Adjusting Financial Leverage Beta' },
          { title: 'Debt Covenants and Credit Rating Considerations' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Leverage Analysis and Dividend Decisions',
        description: 'Operating and financial leverage interactions, EBIT-EPS indifference analysis, dividend models (Gordon, Walter), share repurchases vs dividends.',
        topics: [
          { title: 'Degree of Operating, Financial & Combined Leverage' },
          { title: 'EBIT-EPS Analysis & Financial Risk Assessment' },
          { title: 'Dividend Policy Determinants & Shareholder Preferences' },
          { title: 'Stock Repurchases, Bonus Shares & Stock Splits' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER VI — HR SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 344',
    subject_name: 'Training and Development Practices in Organization',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'HR Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Training Philosophy and Needs Assessment',
        description: 'Training concepts, importance, learning theories (adult learning, experiential learning), Training Need Assessment (TNA) models, organizational alignment.',
        topics: [
          { title: 'Strategic Role of Training & Adult Learning Principles (Andragogy)' },
          { title: 'Training Need Assessment (TNA) at Organizational Level' },
          { title: 'Task and Competency Gap Analysis' },
          { title: 'Individual Employee Training Need Identification' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Training Methods and Instructional Design',
        description: 'On-the-job methods (coaching, mentoring, apprenticeship), off-the-job methods (lectures, case study, role play, simulation), e-learning platforms.',
        topics: [
          { title: 'On-the-Job Training (OJT) Techniques & Mentoring Models' },
          { title: 'Classroom & Experiential Training (Case Method, Business Games)' },
          { title: 'Digital Learning, MOOCs & Micro-Learning Modules' },
          { title: 'Instructional Design: ADDIE and SAM Frameworks' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Management Development and Behavioral Interventions',
        description: 'Executive development programs, sensitivity training (T-groups), behavioral modeling, assessment centers, succession planning.',
        topics: [
          { title: 'Executive Development Methods & Leadership Pipelines' },
          { title: 'Sensitivity Training (T-Groups) & Transactional Analysis' },
          { title: 'Behavioral Role Modeling & Simulation Games' },
          { title: 'Leadership Succession Planning & Talent Review Boards' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Training Evaluation, ROI and Career Development',
        description: 'Kirkpatrick four levels, Phillips ROI methodology, career stages, career planning models, organizational career development systems.',
        topics: [
          { title: 'Kirkpatrick Model of Training Evaluation (Levels 1-4)' },
          { title: 'Calculating Return on Investment (ROI) of Training (Phillips)' },
          { title: 'Career Stages, Career Paths & Dual Career Ladders' },
          { title: 'Overcoming Career Plateaus & Mentorship Programs' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 345',
    subject_name: 'Industrial Relations & Labour Laws',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'HR Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Industrial Relations Framework and Trade Unions',
        description: 'IR concept, importance, perspectives (unitary, pluralist, Marxist), trade union growth in India, Trade Unions Act 1926, industrial disputes.',
        topics: [
          { title: 'Perspectives on Industrial Relations (Unitary, Pluralist, Radical)' },
          { title: 'Trade Union Movement in India & Legal Protections' },
          { title: 'Causes and Manifestations of Industrial Disputes' },
          { title: 'Conciliation, Arbitration and Adjudication Machineries' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Participative Management and Collective Bargaining',
        description: 'Workers participation in management, works committees, Joint Management Councils, collective bargaining process, tactics, agreements.',
        topics: [
          { title: 'Levels of Workers’ Participation in Management (WPM)' },
          { title: 'Works Committees & Joint Management Councils in India' },
          { title: 'Collective Bargaining Process, Tactics and Dynamics' },
          { title: 'Enforceability of Collective Bargaining Agreements' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Industrial Unrest, Disciplinary Action and Standing Orders',
        description: 'Strikes, lockouts, gheraos, Industrial Employment (Standing Orders) Act 1946, domestic enquiry procedures, principles of natural justice, absenteeism.',
        topics: [
          { title: 'Legal Provisions on Strikes, Lockouts and Retrenchment' },
          { title: 'Industrial Employment (Standing Orders) Act Provisions' },
          { title: 'Conducting Domestic Enquiry & Natural Justice Rules' },
          { title: 'Managing Absenteeism and Labor Turnover' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Key Labor Welfare Legislations and New Labor Codes',
        description: 'Factories Act 1948 (health, safety, welfare), Payment of Wages, Minimum Wages, Workmen’s Compensation, Overview of the 4 New Labor Codes in India.',
        topics: [
          { title: 'Factories Act 1948: Health, Safety & Welfare Measures' },
          { title: 'Social Security Acts: ESI, EPF, Gratuity & Maternity Benefit' },
          { title: 'Payment of Wages & Minimum Wages Regulations' },
          { title: 'Overview of New Labor Codes (Wages, Social Security, IR, OSH)' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 346',
    subject_name: 'Negotiation & Conflict Management',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'HR Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Conflict Dynamics and Resolution Models',
        description: 'Conflict meaning, sources, functional vs dysfunctional conflict, conflict process (Pondy model), conflict resolution and stimulation techniques.',
        topics: [
          { title: 'Nature, Sources and Levels of Organizational Conflict' },
          { title: 'Functional vs Dysfunctional Conflict Inferences' },
          { title: 'Stages of Conflict Process & Latent Conflict' },
          { title: 'Dual Concern Model of Conflict Resolution' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Interpersonal Conflict and Cross-Cultural Dimensions',
        description: 'Myths about conflict, individual styles of conflict handling, emotional intelligence in conflict, cultural differences in conflict approaches.',
        topics: [
          { title: 'Conflict Handling Orientations: Competing, Collaborating, etc.' },
          { title: 'Interpersonal Communication Barriers & Emotional Control' },
          { title: 'Cross-Cultural Approaches to Dispute Management' },
          { title: 'Preventing Team De-escalation & Restoring Trust' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'The Negotiation Process and Power Dynamics',
        description: 'Elements of negotiation, stages, distributive vs integrative bargaining, BATNA (Best Alternative to a Negotiated Agreement), reservation price, persuasion.',
        topics: [
          { title: 'Distributive vs Integrative Bargaining Paradigms' },
          { title: 'Negotiation Preparation: BATNA, Reservation Price & ZOPA' },
          { title: 'Power, Leverage and Persuasion Strategies in Negotiation' },
          { title: 'Framing, Anchoring and Concession-Making Tactics' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Negotiation Breakdown and Third-Party Intervention',
        description: 'Causes of impasse, intractable negotiations, third-party dispute resolution (mediation, conciliation, arbitration), mutual trust building.',
        topics: [
          { title: 'Causes of Impasse and Deadlock in Negotiations' },
          { title: 'Techniques for Breaking Deadlocks & Reframing Issues' },
          { title: 'Third-Party Dispute Resolution: Mediation vs Arbitration' },
          { title: 'Post-Negotiation Relationship Building and Contract Execution' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // SEMESTER VI — BUSINESS ANALYTICS SPECIALIZATION ELECTIVES
  // ----------------------------------------------------------------------------
  {
    subject_code: 'NBA 354',
    subject_name: 'Statistical Data Analysis Using SPSS',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Analytics Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to SPSS Environment and Data Handling',
        description: 'Overview of SPSS GUI, Data View vs Variable View, importing data from Excel/CSV, variable types and labels, computing new variables, recoding.',
        topics: [
          { title: 'SPSS Interface Navigation: Data View & Variable View' },
          { title: 'Importing External Datasets & Variable Formatting' },
          { title: 'Recoding Variables (Same vs Different Variables)' },
          { title: 'Compute Variable Commands & Data Transformations' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Data Management and Diagrammatic Representation',
        description: 'Select cases, split file, sorting, aggregate data, creating charts (bar, pie, histogram, scatter plot, box plot), chart editor customization.',
        topics: [
          { title: 'Data Management: Split File, Select Cases & Sort Cases' },
          { title: 'Generating Frequency Tables & Descriptive Statistics' },
          { title: 'Creating High-Resolution Visualizations in SPSS' },
          { title: 'Modifying Charts using SPSS Chart Editor' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Correlation and Regression in SPSS',
        description: 'Bivariate correlation (Pearson, Spearman), partial correlation, linear regression, multiple regression modeling, interpreting SPSS regression output.',
        topics: [
          { title: 'Pearson and Spearman Correlation Testing in SPSS' },
          { title: 'Simple Linear Regression & Scatter Plot Fits' },
          { title: 'Multiple Linear Regression & Interpreting ANOVA / Coefficients' },
          { title: 'Testing Multicollinearity (VIF) & Residual Diagnostics' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Hypothesis Testing: Parametric and Non-Parametric in SPSS',
        description: 'One-sample t-test, independent sample t-test, paired t-test, One-way ANOVA, Chi-square test, Mann-Whitney U test, Wilcoxon signed-rank test.',
        topics: [
          { title: 'Independent and Paired Samples t-Tests in SPSS' },
          { title: 'One-Way ANOVA & Post-Hoc Tests (Tukey, Scheffe)' },
          { title: 'Chi-Square Cross-Tabulations & Test of Independence' },
          { title: 'Non-Parametric Tests (Mann-Whitney, Kruskal-Wallis)' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 355',
    subject_name: 'Business Intelligence and Data Visualization',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Analytics Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'Introduction to Business Intelligence and Data Architecture',
        description: 'Definition of BI, historical perspective, BI architecture (data warehouse, ETL, OLAP), Business Performance Management, cyclical BI analysis process.',
        topics: [
          { title: 'Business Intelligence Framework & Strategic Role' },
          { title: 'Data Warehousing, Star & Snowflake Schemas' },
          { title: 'ETL Pipelines & Online Analytical Processing (OLAP)' },
          { title: 'Executive Information Systems & Business Dashboards' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Data and Information Visualization Principles',
        description: 'History of data visualization, visualization for businesses, charts taxonomy, visual perception, color theory, dashboard architecture.',
        topics: [
          { title: 'Principles of Effective Data Visualization & Storytelling' },
          { title: 'Chart Selection Matrix according to Data Types' },
          { title: 'Gestalt Principles of Visual Perception in Dashboard Design' },
          { title: 'Key Performance Indicator (KPI) Widgets & Gauges' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Working with Tableau: Data Sources and Core Visuals',
        description: 'Connecting to data sources in Tableau, dimensions vs measures, creating univariate and bivariate charts, heat maps, tree maps, geographical mapping.',
        topics: [
          { title: 'Tableau Interface: Connecting Data Sources & Data Blending' },
          { title: 'Dimensions vs Measures & Discrete vs Continuous Fields' },
          { title: 'Creating Bar, Line, Scatter, Area and Bullet Charts' },
          { title: 'Geospatial Mapping & Polygon Maps in Tableau' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Calculated Fields, Interactive Dashboards and Storytelling',
        description: 'Calculated fields, LOD (Level of Detail) expressions, parameters, filters, building interactive dashboards with actions, Tableau Story points.',
        topics: [
          { title: 'Calculated Fields, Logical Functions & Date Calculations' },
          { title: 'Level of Detail (LOD) Expressions (Fixed, Include, Exclude)' },
          { title: 'Dashboard Actions: Filter, Highlight, URL Interactions' },
          { title: 'Publishing Interactive Stories & Executive Dashboards' },
        ],
      },
    ],
  },
  {
    subject_code: 'NBA 356',
    subject_name: 'Excel for Business Applications',
    year_number: 3,
    semester_number: 6,
    credits: 3,
    hours: 30,
    category: 'Analytics Elective',
    units: [
      {
        unit_number: 1,
        unit_title: 'General Fundamentals and Advanced Formulas',
        description: 'Excel interface optimization, cell referencing (relative, absolute, mixed), mathematical, statistical and logical functions (IF, IFS, AND, OR).',
        topics: [
          { title: 'Workbook Architecture & Keyboard Productivity Shortcuts' },
          { title: 'Relative, Absolute ($) and 3D Cell Referencing' },
          { title: 'Nested Logical Functions (IF, IFS, AND, OR, SWITCH)' },
          { title: 'Mathematical & Rounding Formulas (SUMPRODUCT, ROUND)' },
        ],
      },
      {
        unit_number: 2,
        unit_title: 'Lookup, Reference and Text Manipulation Functions',
        description: 'VLOOKUP, HLOOKUP, modern XLOOKUP, INDEX and MATCH, text functions (CONCAT, TEXTSPLIT, LEFT, RIGHT, MID), date and time functions.',
        topics: [
          { title: 'Vertical & Horizontal Lookups (VLOOKUP, HLOOKUP)' },
          { title: 'Advanced Two-Way Lookups with INDEX-MATCH' },
          { title: 'Modern Dynamic Array Lookups using XLOOKUP' },
          { title: 'Text Cleansing Functions & Date-Time Arithmetic' },
        ],
      },
      {
        unit_number: 3,
        unit_title: 'Data Analysis, Conditional Formatting and Pivot Tables',
        description: 'Data validation rules, conditional formatting with formulas, sorting and multi-level filtering, Pivot Tables, Pivot Charts, slicers and timelines.',
        topics: [
          { title: 'Complex Data Validation Rules & Drop-Down Lists' },
          { title: 'Formula-Based Conditional Formatting & Heatmaps' },
          { title: 'Pivot Table Creation, Calculated Fields & Slicers' },
          { title: 'Dynamic Pivot Charts & Executive KPI Cards' },
        ],
      },
      {
        unit_number: 4,
        unit_title: 'Financial Modeling, What-If Analysis and Macros',
        description: 'Financial functions (PMT, NPV, IRR), What-If Analysis (Data Tables, Goal Seek, Scenario Manager), recording basic VBA macros for automation.',
        topics: [
          { title: 'Financial Functions for Loan Amortization & Valuation (PMT, NPV, IRR)' },
          { title: 'What-If Analysis: Goal Seek, One-Way & Two-Way Data Tables' },
          { title: 'Scenario Manager for Business Budget Simulations' },
          { title: 'Introduction to Recording VBA Macros & Button Assignment' },
        ],
      },
    ],
  },
];

async function main() {
  console.log('========================================================================');
  console.log('  HBTU Kanpur — Seeding Official BBA Curriculum & Syllabus');
  console.log('  Academic Session: 2024-25 (Semesters I to VI)');
  console.log('========================================================================\n');

  // 1. Fetch BBA Program
  const { data: bbaProg, error: progErr } = await supabase
    .from('programs')
    .select('id, name, short_code')
    .eq('short_code', 'BBA')
    .single();

  if (progErr || !bbaProg) {
    console.error('❌ Could not find BBA program:', progErr?.message);
    process.exit(1);
  }

  // 2. Fetch BBA Branch
  const { data: bbaBranch, error: brErr } = await supabase
    .from('branches')
    .select('id, name, code, program_id')
    .eq('program_id', bbaProg.id)
    .single();

  if (brErr || !bbaBranch) {
    console.error('❌ Could not find BBA branch:', brErr?.message);
    process.exit(1);
  }

  console.log(`✅ Loaded BBA Program: ${bbaProg.name} (${bbaProg.id})`);
  console.log(`✅ Loaded BBA Branch:  ${bbaBranch.name} [${bbaBranch.code}] (${bbaBranch.id})\n`);

  // 3. Clean up old preliminary subjects for BBA
  console.log('Cleaning up old preliminary subjects for BBA...');
  await supabase.from('subjects').delete().eq('branch_id', bbaBranch.id);

  // 4. Insert All Official Subjects
  console.log(`Seeding ${bbaSubjects.length} official BBA subjects...`);
  const subjectPayload = bbaSubjects.map((s) => ({
    subject_code: s.subject_code,
    subject_name: s.subject_name,
    program_id: bbaProg.id,
    branch_id: bbaBranch.id,
    year_number: s.year_number,
    semester_number: s.semester_number,
    credits: s.credits,
    hours: s.hours,
    category: s.category,
    status: 'active',
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('subjects')
    .upsert(subjectPayload, { onConflict: 'subject_code,branch_id,semester_number' })
    .select();

  if (insertErr) {
    console.error('❌ Failed to insert BBA subjects:', insertErr.message);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${inserted.length} subjects for BBA.`);

  // 5. Prepare all Units and Topics for bulk insertion
  console.log(`   Preparing units and topics for ${inserted.length} subjects...`);
  const insertedMap = new Map();
  inserted.forEach((s) => insertedMap.set(`${s.subject_code}_${s.semester_number}`, s.id));

  const allUnitRows = [];
  const unitsMeta = [];

  for (const rawSub of bbaSubjects) {
    const subId = insertedMap.get(`${rawSub.subject_code}_${rawSub.semester_number}`);
    if (!subId || !rawSub.units) continue;

    for (const u of rawSub.units) {
      allUnitRows.push({
        subject_id: subId,
        unit_number: u.unit_number,
        unit_title: u.unit_title,
        description: u.description,
        hours: Math.round(rawSub.hours / (rawSub.units.length || 4)),
      });
      unitsMeta.push({
        subject_id: subId,
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
          details: `Topic in Unit ${meta.unit_number} for BBA syllabus.`,
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

  console.log(`   ✅ Inserted ${allUnitRows.length} syllabus units and ${allTopicRows.length} topics for BBA.`);
  console.log('\n========================================================================');
  console.log('🎉 OFFICIAL BBA CURRICULUM & SYLLABUS SEEDED SUCCESSFULLY!');
  console.log('========================================================================');
}

main().catch(console.error);
