import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { getBaseUrl } from '@/lib/auth/url'

export const metadata: Metadata = {
  title: {
    default: 'Harcoutian Study Hub — Modern Academic Platform',
    template: '%s | Harcoutian Study Hub',
  },
  description:
    'Harcoutian Study Hub: An independent, unofficial student study portal featuring canonical syllabus roadmaps, verified lecture notes, previous year question papers (PYQs), digital academic library, and calculators for HBTU undergraduate engineering and management programs.',
  metadataBase: new URL(getBaseUrl()),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Harcoutian Study Hub',
    title: 'Harcoutian Study Hub — Modern Academic Platform',
    description:
      'Independent student study portal with syllabus roadmaps, lecture notes, PYQs, and digital library for HBTU programs.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
}

// Theme initialization script to prevent FOUC (Flash of Unstyled Content)
// Runs before React hydration to set the correct data-theme attribute
const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('harcoutian_theme');
      var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#4f46e5" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
