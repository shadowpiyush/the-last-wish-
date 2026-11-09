'use client'

import { useEffect } from 'react'

export interface PerformanceMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'INP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

function getRating(name: PerformanceMetric['name'], value: number): PerformanceMetric['rating'] {
  switch (name) {
    case 'FCP':
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor'
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
    case 'INP':
    case 'FID':
      return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor'
    case 'TTFB':
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor'
  }
}

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    const logMetric = (metric: PerformanceMetric) => {
      if (process.env.NODE_ENV === 'development') {
        const color = metric.rating === 'good' ? '#10b981' : metric.rating === 'needs-improvement' ? '#f59e0b' : '#ef4444'
        console.log(
          `%c⚡ [Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating})`,
          `color: ${color}; font-weight: bold;`
        )
      }
    }

    try {
      // 1. TTFB & Navigation Timing
      const navEntries = performance.getEntriesByType('navigation')
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming
        const ttfb = nav.responseStart - nav.requestStart
        if (ttfb >= 0) {
          logMetric({ name: 'TTFB', value: ttfb, rating: getRating('TTFB', ttfb), timestamp: Date.now() })
        }
      }

      // 2. First Contentful Paint (FCP)
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            logMetric({
              name: 'FCP',
              value: entry.startTime,
              rating: getRating('FCP', entry.startTime),
              timestamp: Date.now(),
            })
          }
        }
      })
      paintObserver.observe({ type: 'paint', buffered: true })

      // 3. Largest Contentful Paint (LCP)
      let lcpValue = 0
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          lcpValue = lastEntry.startTime
        }
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

      // 4. Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as unknown as { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as unknown as { value?: number }).value || 0
          }
        }
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })

      // Log LCP and CLS on visibility change (page hide)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          if (lcpValue > 0) {
            logMetric({ name: 'LCP', value: lcpValue, rating: getRating('LCP', lcpValue), timestamp: Date.now() })
          }
          logMetric({ name: 'CLS', value: clsValue, rating: getRating('CLS', clsValue), timestamp: Date.now() })
        }
      }

      window.addEventListener('visibilitychange', handleVisibilityChange, { passive: true })

      return () => {
        paintObserver.disconnect()
        lcpObserver.disconnect()
        clsObserver.disconnect()
        window.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    } catch {
      // Graceful fallback if PerformanceObserver options not supported
    }
  }, [])

  return null
}

