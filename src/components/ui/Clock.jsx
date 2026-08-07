import { useEffect, useState } from 'react'
import { nowDateTimeLabel } from '../../utils/dateUtils'

/**
 * Clock — วันที่/เวลาปัจจุบันเล็กๆ กำกับไว้เฉยๆ (ไม่มี interaction ใดๆ ทั้งสิ้น)
 * อัปเดตทุก 30 วินาทีพอ (ไม่จำเป็นต้อง re-render ทุกวินาทีสำหรับ label ที่ granularity เป็นนาที
 * อยู่แล้ว — ยิ่งอัปเดตถี่ยิ่งกิน battery มือถือโดยไม่มีประโยชน์เพิ่ม)
 */
export default function Clock({ className, style }) {
  const [label, setLabel] = useState(() => nowDateTimeLabel())

  useEffect(() => {
    const id = setInterval(() => setLabel(nowDateTimeLabel()), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={className} style={style}>
      {label}
    </span>
  )
}
