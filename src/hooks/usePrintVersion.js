import { useEffect, useState } from 'react'

const STORAGE_PREFIX = 'printlog:'

// สร้าง signature ง่ายๆจากเนื้อหาเอกสาร (ไม่ใช่ crypto hash แค่พอเทียบว่าข้อมูลเปลี่ยนไปหรือไม่)
function signatureOf(data) {
  const text = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return `${text.length}_${hash}`
}

/**
 * usePrintVersion — ติดตามสถานะปริ้น/แชร์ของเอกสารหนึ่งชิ้น (docId ต้อง unique ต่อเอกสาร เช่น batchId หรือ วันที่+หมวด)
 * หมายเหตุ: เก็บที่ localStorage ของเครื่องนั้นเท่านั้น (ไม่ sync ข้ามเครื่อง) — ถ้าปริ้นจากเครื่องอื่น
 * จะไม่เห็นประวัติเครื่องนี้ เป็นข้อจำกัดที่ยอมรับได้ในเวอร์ชันนี้ เพราะเอกสารส่วนใหญ่ปริ้นจากเครื่องเดียวที่หน้าร้าน
 */
export function usePrintVersion(docId, data) {
  const [log, setLog] = useState(null)
  const storageKey = `${STORAGE_PREFIX}${docId}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      setLog(raw ? JSON.parse(raw) : null)
    } catch {
      setLog(null)
    }
  }, [storageKey])

  const currentSignature = signatureOf(data)
  const staleSincePrint = !!log && log.signature !== currentSignature

  const recordPrint = () => {
    const next = {
      signature: currentSignature,
      count: (log?.count || 0) + 1,
      lastPrintedAt: new Date().toISOString()
    }
    localStorage.setItem(storageKey, JSON.stringify(next))
    setLog(next)
  }

  return { log, staleSincePrint, recordPrint }
}
