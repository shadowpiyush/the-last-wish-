'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface ToastContextType {
  showToast: (params: { type?: Toast['type']; message: string; duration?: number }) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ type = 'info', message, duration = 4000 }: { type?: Toast['type']; message: string; duration?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      setToasts((prev) => [...prev, { id, type, message }])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" role="status">
            {toast.type === 'success' && <CheckCircle2 size={18} color="var(--color-success)" />}
            {toast.type === 'error' && <AlertCircle size={18} color="var(--color-danger)" />}
            {toast.type === 'info' && <Info size={18} color="var(--color-accent)" />}
            <span style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ color: 'var(--text-tertiary)', padding: 2 }}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
