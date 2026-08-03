import { useEffect, useState } from 'react'

/**
 * LoadingOverlay — โชว์ระหว่างรออ่าน/เขียนข้อมูลที่ใช้เวลานาน
 * ถ้าเกิน 3 วินาที เปลี่ยนข้อความเป็นแจ้งเหตุผล (คนใช้พร้อมกันเยอะ) กันผู้ใช้กดซ้ำเพราะคิดว่าไม่ทำงาน
 */
export default function LoadingOverlay({ show, label = 'กำลังโหลดข้อมูล...' }) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!show) {
      setSlow(false)
      return undefined
    }
    const t = setTimeout(() => setSlow(true), 3000)
    return () => clearTimeout(t)
  }, [show])

  if (!show) return null

  return (
    <div style={overlayStyle} role="status" aria-live="polite">
      <div style={boxStyle}>
        <div style={spinnerStyle} aria-hidden="true" />
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          {slow ? 'กำลังบันทึก อาจใช้เวลาสักครู่เนื่องจากมีผู้ใช้งานพร้อมกันหลายคน' : label}
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(17, 24, 23, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3000
}

const boxStyle = {
  background: 'white',
  borderRadius: 'var(--radius)',
  padding: '28px 32px',
  boxShadow: 'var(--shadow-modal)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  maxWidth: 320,
  textAlign: 'center'
}

const spinnerStyle = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '4px solid var(--color-primary-light)',
  borderTopColor: 'var(--color-primary)',
  animation: 'btn-spin 0.8s linear infinite'
}
