/**
 * parseScannedCode — แยกค่าที่ได้จากกล้อง/กรอกมือ ออกเป็น { sku, weight }
 * QR ของสินค้าจริงเข้ารหัสเป็น "รหัสสินค้า|น้ำหนัก" เช่น "FG0001|0.5" (คั่นด้วย | เท่านั้น
 * ไม่มีเว้นวรรค) — ถ้าไม่มี | เลยก็ถือว่าทั้งสตริงเป็นรหัสสินค้าอย่างเดียว (กรอกมือปกติจะเป็นแบบนี้)
 * ต้องเรียกฟังก์ชันนี้ก่อนเอาไปค้นหาใน Sheet เสมอ ห้ามเอาสตริงดิบทั้งก้อนไปค้นหาตรงๆ
 */
export function parseScannedCode(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return { sku: '', weight: null }

  const parts = text.split('|').map((p) => p.trim())
  const sku = parts[0]
  const weightRaw = parts[1]
  const weight = weightRaw !== undefined && weightRaw !== '' && !Number.isNaN(Number(weightRaw)) ? Number(weightRaw) : null

  return { sku, weight }
}
