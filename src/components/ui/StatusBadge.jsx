// map สถานะที่ใช้ทั่วระบบ -> โทนสี (สงวนเขียว/เหลือง/แดงไว้เฉพาะบอกสถานะเท่านั้นตาม H1)
const TONES = {
  success: { bg: 'var(--color-success-bg)', fg: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' },
  danger: { bg: 'var(--color-danger-bg)', fg: 'var(--color-danger)' },
  info: { bg: 'var(--color-info-bg)', fg: 'var(--color-info)' },
  neutral: { bg: 'var(--color-surface)', fg: 'var(--color-text-muted)' }
}

export default function StatusBadge({ label, tone = 'neutral', icon }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 15,
        fontWeight: 700,
        background: t.bg,
        color: t.fg,
        whiteSpace: 'nowrap'
      }}
    >
      {icon} {label}
    </span>
  )
}

// helper กลาง ใช้แปลงสถานะกระทบยอด (D4) เป็น tone ให้ตรงกันทุกจุดที่แสดงผล
export function reconciliationStatusTone(status) {
  if (status === 'ถูกต้อง') return { tone: 'success', icon: '🟢' }
  if (status === 'ของเกิน') return { tone: 'warning', icon: '🟡' }
  if (status === 'ของหาย') return { tone: 'info', icon: '🔵' }
  return { tone: 'neutral', icon: '' }
}
