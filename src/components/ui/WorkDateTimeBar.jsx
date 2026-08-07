import { useEffect, useState } from 'react'
import { todayDateLabel, nowTimeLabel } from '../../utils/dateUtils'

/**
 * WorkDateTimeBar — แถบบอกวันที่/เวลาปัจจุบันกำกับไว้เป็นบริบทของงานที่กำลังทำ
 * (เช่น "กำลังบันทึกรายการของวันที่ 7 ส.ค. 2026") ใช้ในหน้ารับเข้า/ตีคืนตามที่ขอ
 * อัปเดตทุก 30 วินาทีให้เวลาที่แสดงสดอยู่เสมอ (ไม่ใช่ค้างค่าตอน mount ครั้งแรก)
 */
export default function WorkDateTimeBar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={styles.bar}>
      📅 {todayDateLabel(now)} • ⏰ {nowTimeLabel(now)}
    </div>
  )
}

const styles = {
  bar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-primary-dark)',
    background: 'var(--color-primary-light)',
    padding: '6px 14px',
    borderRadius: 999,
    marginBottom: 16
  }
}
