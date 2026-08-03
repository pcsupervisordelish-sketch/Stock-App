import { readSheet } from './sheetsService'
import { todayKey } from '../utils/dateUtils'

/**
 * ค้นหาสินค้าจาก SKU — ใช้ร่วมกันทุกโมดูลที่ต้องสแกนแล้วขึ้นชื่อสินค้าอัตโนมัติ (B, C)
 * - สาขาห้าง: ดูจาก ProductMasterBooth / ProductMasterFridge (source of truth ตาม E5)
 * - สาขาบริษัท: ดูจาก baseline SAP ที่ import ไว้วันนี้ (Tab StockCountBaseline ตาม A1)
 * ไม่พบ -> คืนค่า null ให้หน้าจอเปิดโหมดกรอกชื่อเอง (ไม่บล็อกการทำงาน)
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

  const rows = await readSheet('StockCountBaseline', {
    รหัสสินค้า: code,
    สาขา: branchCode,
    วันที่นำเข้า: todayKey()
  })
  if (rows[0]) {
    return {
      sku: rows[0]['รหัสสินค้า'],
      name: rows[0]['ชื่อสินค้า'],
      unit: rows[0]['หน่วยนับ หน้าร้าน'] || rows[0]['หน่วยนับหลัก'] || ''
    }
  }
  return null
}

function mapMasterRow(row) {
  return { sku: row['รหัส'], name: row['ชื่อไทย'], unit: row['หน่วย'] || '' }
}
