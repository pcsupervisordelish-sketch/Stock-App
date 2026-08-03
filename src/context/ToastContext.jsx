import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)
let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // type: 'success' | 'error' | 'info'
  const show = useCallback(
    (message, { type = 'info', duration = 3500 } = {}) => {
      const id = ++idCounter
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration) setTimeout(() => remove(id), duration)
      return id
    },
    [remove]
  )

  return (
    <ToastContext.Provider value={{ show, remove }}>
      {children}
      <div style={styles.container} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} style={{ ...styles.toast, ...toastColor(t.type) }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function toastColor(type) {
  if (type === 'success') return { background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }
  if (type === 'error') return { background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }
  return { background: 'var(--color-info-bg)', color: 'var(--color-info)', borderColor: 'var(--color-info)' }
}

const styles = {
  container: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: 'min(92vw, 480px)'
  },
  toast: {
    padding: '14px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid',
    fontSize: 17,
    fontWeight: 600,
    boxShadow: 'var(--shadow-card)'
  }
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast ต้องถูกใช้ภายใน <ToastProvider>')
  return ctx
}
