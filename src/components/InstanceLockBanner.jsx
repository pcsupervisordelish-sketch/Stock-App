import { useInstanceLock } from '../hooks/useInstanceLock'

export default function InstanceLockBanner() {
  const { otherInstanceDetected } = useInstanceLock()

  if (!otherInstanceDetected) return null

  return (
    <div
      role="alert"
      style={{
        background: 'var(--color-warning-bg)',
        color: '#7A5B00',
        padding: '12px 16px',
        fontSize: 15,
        fontWeight: 700,
        textAlign: 'center',
        borderBottom: '2px solid var(--color-warning)'
      }}
    >
      ⚠️ พบว่าเปิดแอปนี้ค้างอยู่อีกหน้าต่าง/แท็บบนเครื่องนี้แล้ว กรุณาใช้หน้าต่างเดิมต่อ
      เพื่อป้องกันข้อมูลสับสน/ตกหล่น
    </div>
  )
}
