import { readSheet } from './sheetsService'
import { todayKey } from '../utils/dateUtils'
import { mapMasterRow, mapCompanyMasterRow } from './productMasterCache'

/**
 * ค้นหาสินค้าจาก SKU แบบยิง network เดี่ยวๆ (ไม่ใช่ทั้งชุด) — ใช้เป็น "fallback" เท่านั้น
 * เมื่อหาในแคช (useCachedData + productMasterCache.js) ไม่เจอ เผื่อเป็น SKU ที่เพิ่งเพิ่มใหม่
 * ใน Sheet หลัง cache ถูกโหลดไปแล้ว — ทางหลักที่ควรใช้ต้องเป็นแคชในเครื่องเสมอเพื่อความเร็ว
 * ไม่ใช่ฟังก์ชันนี้ตรงๆทุกครั้งที่สแกน (จะช้ามากถ้าเรียกถี่ๆ)
 *
 * - สาขาห้าง: ดูจาก ProductMasterBooth / ProductMasterFridge (source of truth ตาม E5)
 * - สาขาบริษัท: ดูจาก 2 แหล่ง เรียงลำดับความสำคัญ (ProductMasterCompany ก่อน, StockCountBaseline
 *   ของวันนี้เป็น fallback) — โมดูล A ไม่ใช้ฟังก์ชันนี้เลย ยังคงดึง baseline ตรงเหมือนเดิม
 * ไม่พบ -> คืนค่า null ให้หน้าจอเปิดโหมดกรอกชื่อเอง (ไม่บล็อกการทำงาน)
 */
export async function lookupProduct(sku, { branchType, branchCode }) {
  const code = String(sku || '').trim().toUpperCase() // uppercase กันตัวพิมพ์เล็ก/ใหญ่ปนกัน
  if (!code) return null

  if (branchType === 'ห้าง') {
    const booth = await readSheet('ProductMasterBooth', { รหัส: code })
    if (booth[0]) return mapMasterRow(booth[0])
    const fridge = await readSheet('ProductMasterFridge', { รหัส: code })
    if (fridge[0]) return mapMasterRow(fridge[0])
    return null
  }

  const master = await readSheet('ProductMasterCompany', { รหัสสินค้า: code })
  if (master[0]) return mapCompanyMasterRow(master[0])

  const rows = await readSheet('StockCountBaseline', {
    รหัสสินค้า: code,
    สาขา: branchCode,
    วันที่นำเข้า: todayKey()
  })
  if (rows[0]) return mapCompanyMasterRow(rows[0])

  return null
}
