import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="alert"
      style={{
        background: 'var(--color-danger-bg)',
        color: 'var(--color-danger)',
        padding: '12px 16px',
        fontSize: 15,
        fontWeight: 700,
        textAlign: 'center'
      }}
    >
      📡 ไม่มีสัญญาณอินเทอร์เน็ต — ข้อมูลที่กรอกจะยังอยู่ในเครื่อง แต่บันทึก/ส่งข้อมูลไม่ได้จนกว่าเน็ตจะกลับมา
    </div>
  )
}
