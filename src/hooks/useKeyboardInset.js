import { useEffect, useState } from 'react'

/**
 * useKeyboardInset — ตรวจจับว่าคีย์บอร์ดบนมือถือเปิดอยู่ไหม และบังพื้นที่ไปเท่าไหร่
 * แก้ปัญหา: ปุ่มลอย (StickyActionBar) ที่ปักไว้ตำแหน่ง bottom ของหน้าจอ พอคีย์บอร์ดมือถือเปิดขึ้นมา
 * จะไปทับ/บังปุ่มไว้ข้างใต้ มองไม่เห็นปุ่มระหว่างพิมพ์ (ปัญหาที่พบบ่อยที่สุดของเว็บบนมือถือ)
 *
 * ใช้ window.visualViewport ซึ่งเบราว์เซอร์มือถือสมัยใหม่ (Chrome/Safari บน Android/iOS)
 * รองรับกันทั่วถึงแล้ว — ตอนคีย์บอร์ดเปิด ขนาด viewport ที่มองเห็นจริงจะเล็กลง (แต่ window.innerHeight
 * ไม่เปลี่ยน) ส่วนต่างระหว่างสองค่านี้คือความสูงที่คีย์บอร์ดบังไว้พอดี
 *
 * ถ้าเบราว์เซอร์ไม่รองรับ visualViewport (เก่ามาก) จะคืนค่า 0 เสมอ ไม่กระทบการทำงาน
 * แค่ไม่ได้ขยับปุ่มให้ (กลับไปเป็นพฤติกรรมเดิมที่อาจโดนคีย์บอร์ดบังได้)
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined

    const handleResize = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setInset(keyboardHeight)
    }

    handleResize()
    viewport.addEventListener('resize', handleResize)
    viewport.addEventListener('scroll', handleResize)
    return () => {
      viewport.removeEventListener('resize', handleResize)
      viewport.removeEventListener('scroll', handleResize)
    }
  }, [])

  return inset
}
