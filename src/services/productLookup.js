import { readSheet } from './sheetsService'
import { todayKey } from '../utils/dateUtils'

/**
 * ค้นหาสินค้าจาก SKU — ใช้ร่วมกันทุกโมดูลที่ต้องสแกนแล้วขึ้นชื่อสินค้าอัตโนมัติ (B, C, D1)
 * - สาขาห้าง: ดูจาก ProductMasterBooth / ProductMasterFridge (source of truth ตาม E5)
 * - สาขาบริษัท: ดูจาก 2 แหล่ง เรียงลำดับความสำคัญ:
 *     1) ProductMasterCompany — master ถาวร ไม่ขึ้นกับวัน ใช้เป็นหลักสำหรับโมดูล B (รับเข้า)
 *        และ C (ตีคืน) เพื่อให้ขึ้นชื่อสินค้าอัตโนมัติได้ตลอดเวลา ไม่ต้องรอ import SAP ก่อน
 *     2) StockCountBaseline (บรรทัดเดิม) — baseline SAP ของ "วันนี้" เท่านั้น ใช้เป็น fallback
 *        เผื่อสินค้าเพิ่งมีใน SAP วันนี้แต่ยังไม่ได้เพิ่มลง ProductMasterCompany
 *   หมายเหตุสำคัญ: โมดูล A (นับสต๊อกเทียบ SAP) ไม่ใช้ฟังก์ชันนี้เลย — ยังคงดึงจาก
 *   StockCountBaseline ของวันนั้นโดยตรงเหมือนเดิมทุกประการ (ดู stockCountService.js) เพราะ
 *   ต้องกระทบยอดกับ SAP วันต่อวันจริงๆ ไม่ใช่เทียบกับ master ถาวรที่อาจไม่ตรงกับ SAP ปัจจุบัน
 * ไม่พบทั้ง 2 แหล่ง -> คืนค่า null ให้หน้าจอเปิดโหมดกรอกชื่อเอง (ไม่บล็อกการทำงาน)
 */
export async function lookupProduct(sku, { branchType, branchCode }) {
  const code = sku.trim()
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

function mapMasterRow(row) {
  return { sku: row['รหัส'], name: row['ชื่อไทย'], unit: row['หน่วย'] || '' }
}

function mapCompanyMasterRow(row) {
  return {
    sku: row['รหัสสินค้า'],
    name: row['ชื่อสินค้า'],
    // เช็ค "หน่วย" (คอลัมน์เดี่ยวแบบย่อที่ใช้ใน ProductMasterCompany) ก่อน แล้วค่อย fallback
    // ไปชื่อคอลัมน์เต็มของ StockCountBaseline (หน่วยนับ หน้าร้าน / หน่วยนับหลัก) เผื่อแถวนั้น
    // มาจาก fallback ของ SAP baseline ที่ยังใช้ชื่อคอลัมน์เดิมอยู่
    unit: row['หน่วย'] || row['หน่วยนับ หน้าร้าน'] || row['หน่วยนับหลัก'] || ''
  }
}
