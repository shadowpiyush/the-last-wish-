import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { PerformanceMonitor } from '@/components/providers/PerformanceMonitor'
import { getBaseUrl } from '@/lib/auth/url'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans-loaded',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-display-loaded',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-loaded',
  display: 'swap',
})

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
      var theme = saved || 'light';
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="theme-color" content="#4f46e5" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <PerformanceMonitor />
              {children}
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
