import { useCallback, useEffect, useState } from 'react'

/**
 * useDraftAutosave — ใช้กับทุกหน้าที่มีสถานะ Draft ค้างได้ (นับสต๊อก/รับเข้า/บันทึกของเสีย ฯลฯ)
 * - auto-save ลง localStorage ทันทีทุกครั้งที่ data เปลี่ยน ไม่ต้องรอกดปุ่ม
 * - data ถูก init จาก localStorage แบบ synchronous ตั้งแต่ initial render เสมอ (สำคัญมาก!)
 *   เพราะบางหน้า (เช่นหน้าสรุปก่อนยืนยัน) เป็นคนละ component instance จากหน้าสแกน แต่ใช้ draft key
 *   เดียวกัน — ถ้า data ไม่ sync จาก localStorage ทันที หน้าสรุปจะเห็นค่าว่างเปล่าผิดพลาดทั้งที่มี
 *   draft จริงอยู่ (บั๊กนี้เคยเกิดจริง เพราะเดิมรอ useEffect ซึ่งมาหลัง render แรกเสมอ)
 * - hasRestorableDraft/draftPreview ใช้เฉพาะหน้าที่ต้องการถามผู้ใช้ชัดๆว่า "ทำต่อจากเดิมหรือ
 *   เริ่มใหม่" (เช่น หน้าสแกนที่กลัวผู้ใช้เผลอปิดแท็บกลางคัน) — ไม่ตอบก็ไม่เป็นไร data ก็ยังถูกต้อง
 *   อยู่แล้วตั้งแต่แรก คำตอบ "ทำต่อจากเดิม" แค่ปิด prompt, "เริ่มใหม่" แค่ล้าง data ทิ้ง
 * - key ควรรวม branchCode + วันที่ + ชื่อหน้าจอ กันชนกันข้ามรอบ/ข้ามสาขา
 */
export function useDraftAutosave(key, initialValue) {
  const storageKey = `draft:${key}`

  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : initialValue
    } catch {
      // draft เสีย/parse ไม่ได้ ถือว่าไม่มี draft ที่ใช้ได้ ไม่ทำให้แอปพัง
      return initialValue
    }
  })
  const [hasRestorableDraft, setHasRestorableDraft] = useState(false)
  const [draftPreview, setDraftPreview] = useState(null)

  // เช็คตอน mount ครั้งแรกว่ามี draft เดิมอยู่ไหม (ไว้ให้หน้าที่ต้องการถามผู้ใช้ชัดๆ)
  // data ข้างบนอ่านจาก localStorage ไปแล้วตั้งแต่ initial state จึงถูกต้องอยู่แล้วไม่ต้องรอ effect นี้
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        setDraftPreview(JSON.parse(raw))
        setHasRestorableDraft(true)
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = useCallback(
    (next) => {
      setData(next)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // เผื่อ storage เต็ม — ไม่ throw ให้กระทบ flow หลัก แต่ข้อมูลยังอยู่ใน state
      }
    },
    [storageKey]
  )

  // data ตรงกับ draftPreview อยู่แล้วตั้งแต่ initial state (อ่านจาก localStorage ตรงตั้งแต่แรก)
  // แค่ปิด prompt ก็พอ ไม่ต้อง setData ซ้ำ
  const restoreDraft = useCallback(() => {
    setHasRestorableDraft(false)
  }, [])

  const discardDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setData(initialValue)
    setHasRestorableDraft(false)
    setDraftPreview(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // เรียกทันทีหลัง "ยืนยันส่งข้อมูล" สำเร็จ เพื่อไม่ให้ draft เก่าค้างซ้อนรอบใหม่
  const clearAfterSubmit = useCallback(() => {
    localStorage.removeItem(storageKey)
    setHasRestorableDraft(false)
    setDraftPreview(null)
  }, [storageKey])

  return { data, save, hasRestorableDraft, draftPreview, restoreDraft, discardDraft, clearAfterSubmit }
}
