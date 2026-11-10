'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Search,
  X,
  Lock,
  FileText,
  HardDrive,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export interface FastPdfViewerProps {
  url: string
  streamUrl?: string
  title: string
  fileSize?: number
  onClose: () => void
  initialPage?: number
  onRefreshUrl?: () => Promise<string | null>
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function FastPdfViewer({
  url,
  streamUrl,
  title,
  fileSize,
  onClose,
  initialPage = 1,
  onRefreshUrl,
}: FastPdfViewerProps) {
  // Document state
  const [activeUrl, setActiveUrl] = useState<string>(url)
  const [reloadTrigger, setReloadTrigger] = useState<number>(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [useNativeFallback, setUseNativeFallback] = useState(false)
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string; hint: string } | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [pageInputVal, setPageInputVal] = useState<string>(initialPage.toString())

  // Loading and error states
  const [docLoading, setDocLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isFirstPageRendered, setIsFirstPageRendered] = useState(false)

  // Synchronize when parent prop url updates
  useEffect(() => {
    setActiveUrl(url)
    setUseNativeFallback(false)
    setErrorDetails(null)
    setErrorMsg(null)
  }, [url])

  // Zoom and layout state
  const [scale, setScale] = useState<number>(1.15)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fitMode, setFitMode] = useState<'custom' | 'width'>('width')

  // In-document search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState<number[]>([]) // matching page numbers
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0)
  const [isSearchingText, setIsSearchingText] = useState(false)

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadingTaskRef = useRef<any>(null)
  const pageCacheRef = useRef<Map<number, unknown>>(new Map())

  // Intercept Ctrl+S, Ctrl+P, Cmd+S, Cmd+P for strict anti-download protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
        e.preventDefault()
      }
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false)
        else onClose()
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (!searchOpen) handleNextPage()
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (!searchOpen) handlePrevPage()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, onClose, totalPages, currentPage])

  // ──────────────── 1. LOAD PDF DOCUMENT WITH BYTE-RANGE STREAMING ────────────────
  useEffect(() => {
    if (useNativeFallback) return

    let isCancelled = false
    setDocLoading(true)
    setErrorMsg(null)
    setErrorDetails(null)

    const initPdf = async () => {
      try {
        // Dynamically import PDF.js client module
        const pdfjs = await import('pdfjs-dist')

        // Configure local worker with zero external CDN dependency
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        }

        // Configure byte-range progressive loading:
        // disableAutoFetch: true ensures ONLY the active page's byte ranges are fetched!
        const loadingTask = pdfjs.getDocument({
          url: activeUrl,
          rangeChunkSize: 65536, // 64 KB chunk size for fast R2 roundtrips
          disableAutoFetch: true,
          disableStream: false,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/',
        })

        loadingTaskRef.current = loadingTask

        const doc = await loadingTask.promise
        if (isCancelled) return

        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setDocLoading(false)
      } catch (err: unknown) {
        if (isCancelled) return
        console.error('FastPdfViewer: document loading error:', err)

        // Transparent auto-fallback to streamUrl if direct R2 presigned URL threw CORS / fetch error
        if (streamUrl && activeUrl !== streamUrl) {
          console.warn('FastPdfViewer: direct URL encountered error, switching to same-origin streamUrl:', streamUrl)
          setActiveUrl(streamUrl)
          return
        }

        const rawMsg = (err as Error)?.message || 'Failed to initialize PDF document.'
        setErrorMsg(rawMsg)

        // Student-friendly error classification
        let errTitle = 'Could Not Stream PDF'
        let errMessage = 'The document streaming server could not be reached.'
        let errHint = 'Click "Retry Stream" to reconnect, or switch to the Native Reader below.'

        if (rawMsg.includes('fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('Failed to fetch')) {
          errTitle = 'Stream Connection Interrupted'
          errMessage = 'The PDF range request was interrupted or blocked by the network.'
          errHint = 'Click "Retry Stream" to reconnect, or view via Native Reader.'
        } else if (rawMsg.includes('MissingPDF') || rawMsg.includes('404')) {
          errTitle = 'Document Not Found'
          errMessage = 'The requested note file was not found in digital storage.'
          errHint = 'The file may have been updated or moved. Please contact academic support.'
        } else if (rawMsg.includes('InvalidPDF') || rawMsg.includes('corrupted')) {
          errTitle = 'Corrupted PDF Format'
          errMessage = 'The file header could not be parsed as a valid PDF document.'
          errHint = 'Try refreshing or opening with the Native Reader.'
        }

        setErrorDetails({ title: errTitle, message: errMessage, hint: errHint })
        setDocLoading(false)
      }
    }

    initPdf()

    return () => {
      isCancelled = true
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy()
        } catch {}
      }
    }
  }, [activeUrl, reloadTrigger, streamUrl, useNativeFallback])

  // Retry document loading with fresh signed/stream URL
  const handleRetry = async () => {
    setIsRetrying(true)
    setErrorMsg(null)
    setErrorDetails(null)
    setDocLoading(true)

    try {
      if (onRefreshUrl) {
        const freshUrl = await onRefreshUrl()
        if (freshUrl) {
          setActiveUrl(freshUrl)
        }
      }
      setReloadTrigger((prev) => prev + 1)
    } finally {
      setIsRetrying(false)
    }
  }

  // ──────────────── 2. RENDER ACTIVE PAGE ON DEMAND ────────────────
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || (totalPages > 0 && currentPage > totalPages)) {
      return
    }

    setPageLoading(true)

    // Cancel in-flight render task to prevent canvas collision
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel()
      } catch {}
      renderTaskRef.current = null
    }

    try {
      // Fetch only the requested page object (uses Range Requests)
      const page = await pdfDoc.getPage(currentPage)
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) return

      // Determine scale based on container width or user zoom
      let targetScale = scale
      if (fitMode === 'width' && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48 // padding
        const unscaledViewport = page.getViewport({ scale: 1.0 })
        if (containerWidth > 300) {
          targetScale = Math.min(2.5, Math.max(0.75, containerWidth / unscaledViewport.width))
        }
      }

      // Handle Retina / HiDPI screens for ultra-crisp equations, text, and diagrams
      const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      const viewport = page.getViewport({ scale: targetScale })

      canvas.width = Math.floor(viewport.width * pixelRatio)
      canvas.height = Math.floor(viewport.height * pixelRatio)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined

      const renderContext = {
        canvasContext: context,
        viewport,
        transform,
      }

      const renderTask = page.render(renderContext)
      renderTaskRef.current = renderTask

      await renderTask.promise
      setPageLoading(false)
      setIsFirstPageRendered(true)
    } catch (renderErr: unknown) {
      // If cancelled by another page switch, ignore error
      if ((renderErr as { name?: string })?.name === 'RenderingCancelledException') {
        return
      }
      console.warn('Page render warning:', renderErr)
      setPageLoading(false)
    }
  }, [pdfDoc, currentPage, totalPages, scale, fitMode])

  useEffect(() => {
    renderCurrentPage()
  }, [renderCurrentPage])

  // Synchronize page input display
  useEffect(() => {
    setPageInputVal(currentPage.toString())
  }, [currentPage])

  // ──────────────── 3. PAGE NAVIGATION CONTROLS ────────────────
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(pageInputVal, 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed)
    } else {
      setPageInputVal(currentPage.toString())
    }
  }

  // ──────────────── 4. ZOOM CONTROLS ────────────────
  const handleZoomIn = () => {
    setFitMode('custom')
    setScale((prev) => Math.min(3.0, +(prev + 0.2).toFixed(2)))
  }

  const handleZoomOut = () => {
    setFitMode('custom')
    setScale((prev) => Math.max(0.6, +(prev - 0.2).toFixed(2)))
  }

  const handleToggleFitWidth = () => {
    if (fitMode === 'width') {
      setFitMode('custom')
      setScale(1.0)
    } else {
      setFitMode('width')
    }
  }

  // ──────────────── 5. IN-DOCUMENT SEARCH ────────────────
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim() || !pdfDoc) return

    setIsSearchingText(true)
    const q = searchQuery.toLowerCase().trim()
    const matches: number[] = []

    try {
      for (let p = 1; p <= totalPages; p++) {
        const page = await pdfDoc.getPage(p)
        const textContent = await page.getTextContent()
        const fullPageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((i: any) => i.str || '')
          .join(' ')
          .toLowerCase()

        if (fullPageText.includes(q)) {
          matches.push(p)
        }
      }

      setSearchMatches(matches)
      setCurrentMatchIdx(0)
      if (matches.length > 0) {
        setCurrentPage(matches[0])
      }
    } catch (searchErr) {
      console.warn('PDF search warning:', searchErr)
    } finally {
      setIsSearchingText(false)
    }
  }

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length
    setCurrentMatchIdx(nextIdx)
    setCurrentPage(searchMatches[nextIdx])
  }

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return
    const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length
    setCurrentMatchIdx(prevIdx)
    setCurrentPage(searchMatches[prevIdx])
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? 0 : '0.75rem',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: isFullscreen ? '100vw' : 1150,
          height: isFullscreen ? '100vh' : '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: isFullscreen ? 0 : 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        {/* ──────────────── 1. CONTROL HEADER TOOLBAR ──────────────── */}
        <div
          style={{
            padding: '0.65rem 1.15rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            backgroundColor: 'rgba(244, 244, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            userSelect: 'none',
          }}
        >
          {/* Document Title & Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, maxWidth: '40%' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, rgba(118, 80, 245, 0.15), rgba(71, 139, 250, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
                flexShrink: 0,
              }}
            >
              <FileText size={18} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={title}
              >
                {title}
              </h3>
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {fileSize ? (
                  <span>{formatFileSize(fileSize)}</span>
                ) : null}
                <span>·</span>
                <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  <Lock size={10} /> Online Only
                </span>
                <span>·</span>
                <span className="badge badge-purple" style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}>
                  ⚡ Range Streamed
                </span>
              </div>
            </div>
          </div>

          {/* Center: Pagination & Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Page Navigation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255, 255, 255, 0.85)',
                padding: '0.2rem 0.4rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
              }}
            >
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || docLoading}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                title="Previous page (Left arrow)"
              >
                <ChevronLeft size={14} />
              </button>

              <form onSubmit={handlePageInputSubmit} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="text"
                  value={pageInputVal}
                  onChange={(e) => setPageInputVal(e.target.value)}
                  style={{
                    width: 38,
                    height: 24,
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: '#fff',
                    padding: 0,
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  / {totalPages || '...'}
                </span>
              </form>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || docLoading}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                title="Next page (Right arrow)"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Zoom Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255, 255, 255, 0.85)',
                padding: '0.2rem 0.4rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
              }}
            >
              <button
                type="button"
                onClick={handleZoomOut}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                title="Zoom out"
              >
                <ZoomOut size={14} />
              </button>

              <button
                type="button"
                onClick={handleToggleFitWidth}
                className={`btn ${fitMode === 'width' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.55rem', fontSize: '0.6875rem', fontWeight: 700 }}
                title="Toggle fit to page width"
              >
                Fit Width
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                title="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>

          {/* Right Actions: Search, Fullscreen, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              className={`btn ${searchOpen ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
              title="Search in PDF (Ctrl+F)"
            >
              <Search size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 6,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close reader (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ──────────────── 2. IN-DOCUMENT SEARCH BAR (COLLAPSIBLE) ──────────────── */}
        {searchOpen && (
          <div
            style={{
              padding: '0.5rem 1.15rem',
              background: '#f8fafc',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <Search size={15} color="var(--color-accent)" />
              <input
                type="text"
                className="form-input"
                style={{ height: 32, fontSize: '0.8125rem', maxWidth: 320 }}
                placeholder="Find keyword in PDF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={isSearchingText}
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                {isSearchingText ? 'Searching...' : 'Find'}
              </button>

              {searchMatches.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>
                    Match {currentMatchIdx + 1} of {searchMatches.length} (Page {searchMatches[currentMatchIdx]})
                  </span>
                  <button
                    type="button"
                    onClick={handlePrevMatch}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.6875rem' }}
                  >
                    ↑ Prev
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.6875rem' }}
                  >
                    ↓ Next
                  </button>
                </div>
              )}

              {searchQuery && searchMatches.length === 0 && !isSearchingText && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No matches found</span>
              )}
            </form>

            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ──────────────── 3. CANVAS PDF PAGE CONTAINER ──────────────── */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            backgroundColor: '#e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: !isFirstPageRendered && (docLoading || pageLoading) ? 'center' : 'flex-start',
            padding: '1.5rem',
            position: 'relative',
          }}
        >
          {/* Initial Loading Skeleton */}
          {!isFirstPageRendered && (docLoading || pageLoading) && !errorMsg && (
            <div
              style={{
                width: 600,
                maxWidth: '90%',
                height: 780,
                background: '#ffffff',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '2rem',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, rgba(118, 80, 245, 0.15), rgba(71, 139, 250, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)',
                }}
              >
                <Loader2 size={28} className="spinner" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Progressive Byte-Range Stream Active
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Fetching Page 1 via Cloudflare R2 Range Requests...
                </p>
              </div>
            </div>
          )}

          {/* Error Notification with Resilient Retry and Classification */}
          {errorMsg && !useNativeFallback && (
            <div
              className="glass-card"
              style={{
                maxWidth: 480,
                padding: '2rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: '#ffffff',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.12)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                }}
              >
                <AlertCircle size={28} color="#ef4444" />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
                {errorDetails?.title || 'Could Not Stream PDF'}
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                {errorDetails?.message || errorMsg}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 20 }}>
                {errorDetails?.hint || 'Click below to reconnect the streaming session.'}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {isRetrying ? (
                    <>
                      <Loader2 size={14} className="spinner" /> Reconnecting...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} /> Retry Stream
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setUseNativeFallback(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Switch to Native Reader
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-neutral"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Native Browser PDF Reader Fallback */}
          {useNativeFallback && (
            <div
              style={{
                width: '100%',
                height: 'calc(100vh - 160px)',
                background: '#ffffff',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.18)',
              }}
            >
              <object
                data={`${activeUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                type="application/pdf"
                width="100%"
                height="100%"
                style={{ border: 'none', display: 'block', width: '100%', height: '100%' }}
              >
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Inline PDF preview is not supported by your browser.
                  </p>
                  <button
                    type="button"
                    onClick={() => setUseNativeFallback(false)}
                    className="btn btn-secondary"
                  >
                    Return to Canvas Reader
                  </button>
                </div>
              </object>
            </div>
          )}

          {/* Rendered Canvas Container */}
          <div
            style={{
              position: 'relative',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.18)',
              borderRadius: 4,
              backgroundColor: '#ffffff',
              display: isFirstPageRendered && !errorMsg && !useNativeFallback ? 'block' : 'none',
            }}
          >
            {/* Subtle Page Loading Indicator for subsequent pages */}
            {isFirstPageRendered && pageLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(15, 23, 42, 0.75)',
                  color: '#fff',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  zIndex: 10,
                }}
              >
                <Loader2 size={12} className="spinner" /> Loading Page {currentPage}...
              </div>
            )}

            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                borderRadius: 4,
              }}
            />
          </div>
        </div>

        {/* ──────────────── 4. FOOTER STATUS BAR ──────────────── */}
        <div
          style={{
            padding: '0.45rem 1.15rem',
            background: '#ffffff',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Page {currentPage} of {totalPages || '...'}</span>
            <span>·</span>
            <span>Scale: {Math.round(scale * 100)}%</span>
            <span>·</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Zero Full-Download Required</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={12} color="var(--color-accent)" /> Progressive On-Demand Rendering
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
