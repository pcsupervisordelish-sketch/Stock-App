// สร้าง transaction ID ที่ unique พอสำหรับกำกับทุก batch ก่อนเขียนเข้า Google Sheet
// ใช้ตรวจสอบตอน retry ว่า batch นี้เขียนสำเร็จไปแล้วหรือยัง (idempotent write)
// รูปแบบ: <deviceId ย่อ>-<timestamp>-<random>
export function newTransactionId(prefix = 'txn') {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now()}_${rand}`
}

// device/instance ID คงที่ต่อเครื่อง — เก็บใน localStorage ครั้งแรกที่เปิดแอป
// ใช้แยก draft ของแต่ละเครื่อง และแนบไปกับ transaction เพื่อ audit
const DEVICE_ID_KEY = 'stockapp_device_id'
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

// instance/session ID ต่อการเปิดแท็บ 1 ครั้ง — ใช้แยก draft ไม่ให้แท็บใหม่ทับแท็บเก่า
export function newInstanceId() {
  return 'inst_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now()
}
