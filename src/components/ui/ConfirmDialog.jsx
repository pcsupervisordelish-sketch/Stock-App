import Button from './Button'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  danger = false,
  loading = false,
  onConfirm,
  onCancel
}) {
  if (!open) return null
  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={box}>
        <h2 style={{ marginBottom: 10 }}>{title}</h2>
        <div style={{ fontSize: 18, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            loadingText="กำลังบันทึก..."
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(17, 24, 23, 0.45)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 2500,
  padding: 16
}

const box = {
  background: 'white',
  borderRadius: 'var(--radius)',
  padding: 24,
  width: '100%',
  maxWidth: 460,
  boxShadow: 'var(--shadow-modal)',
  marginBottom: 8
}
