// รวมฟังก์ชันเกี่ยวกับวันที่/เวลา ใช้จุดเดียวทั้งระบบ กันแต่ละหน้าคำนวณเองแล้วไม่ตรงกัน
// อ้างอิงเวลาท้องถิ่นเครื่องผู้ใช้ (สาขาทั้งหมดอยู่ในไทย ไม่ต้อง handle timezone ข้ามโซน)

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function nowTimeLabel(date = new Date()) {
  // บังคับปี ค.ศ. (gregory) เสมอ — locale th-TH บางเบราว์เซอร์ auto ขึ้นปี พ.ศ. (เช่น 2569 แทน
  // 2026) ทำให้ไม่ตรงกับ todayKey() ที่ใช้ปี ค.ศ. ล้วน เกิดวันที่ไม่สอดคล้องกันในเอกสารเดียวกัน
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', calendar: 'gregory' })
}

export function nowDateTimeLabel(date = new Date()) {
  return date.toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory'
  })
}

// วันที่แบบอ่านง่ายไม่มีเวลา (เช่น "7 ส.ค. 2026") ใช้เป็นหัวข้อบอกบริบทหน้าจอ (เช่น หน้ารับเข้า/ตีคืน)
export function todayDateLabel(date = new Date()) {
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', calendar: 'gregory' })
}

// ใช้เช็คตอนเปิดแอป: ถ้า login ไว้ตั้งแต่ "เมื่อวาน" (คนละ todayKey) ให้บังคับ login ใหม่
export function isDifferentDay(savedDateKey) {
  return savedDateKey !== todayKey()
}

// คำนวณวันที่ย้อนหลัง N วันจากวันนี้ (ใช้เป็น "from" ตอน query ประวัติย้อนหลัง)
export function daysAgoKey(n, date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return todayKey(d)
}

// จำนวนวันที่ค้าง ใช้ในหน้า C3 (รายการตีคืนที่ยังไม่ปิดรอบ) สำหรับจัดกลุ่มสี
export function daysPending(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  then.setHours(0, 0, 0, 0)
  return Math.round((now - then) / 86400000)
}
