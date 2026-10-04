# Harcoutian Study Hub

An independent, unofficial student study portal featuring canonical syllabus roadmaps, verified lecture notes, previous year question papers (PYQs), a digital academic library, and academic calculators for HBTU undergraduate engineering and management programs.

## Tech Stack

- **Framework**: Next.js 16 (App Router, SSR/SSG)
- **Language**: TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth (Email/Password, Google, Apple, GitHub, Phone)
- **Storage**: Supabase Storage (notes, PYQs, ebooks, avatars)
- **Styling**: Vanilla CSS (custom design system with CSS variables)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Antigravity
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your Supabase project credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Run the Supabase schema**
   Execute `supabase/schema.sql` in your Supabase SQL Editor to create all tables, RLS policies, and triggers.

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/              # Authenticated app routes (with layout shell)
│   │   │   ├── dashboard/
│   │   │   ├── syllabus/
│   │   │   ├── curriculum/
│   │   │   ├── notes/
│   │   │   ├── pyq/
│   │   │   ├── library/
│   │   │   ├── calculators/
│   │   │   ├── profile/
│   │   │   ├── compliance/
│   │   │   └── admin/
│   │   ├── auth/               # Auth page (login/register)
│   │   ├── layout.tsx          # Root layout (providers, fonts, meta)
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Global styles & design system
│   ├── components/
│   │   ├── layout/             # AppShell, Header, Sidebar, Footer, MobileNav
│   │   ├── providers/          # AuthProvider, ThemeProvider, ToastProvider
│   │   └── syllabus/           # SyllabusClient component
│   └── lib/
│       └── supabase/           # Supabase client helpers (client, server, SSR)
├── supabase/
│   └── schema.sql              # Full PostgreSQL schema with RLS policies
├── public/                     # Static assets
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Scripts

| Command         | Description                |
| --------------- | -------------------------- |
| `npm run dev`   | Start development server   |
| `npm run build` | Production build           |
| `npm run start` | Start production server    |
| `npm run lint`  | Run ESLint                 |

## License

This project is strictly unofficial and not affiliated with, endorsed by, or sponsored by HBTU.
