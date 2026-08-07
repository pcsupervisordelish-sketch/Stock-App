import { readSheet } from './sheetsService'
import { todayKey } from '../utils/dateUtils'

/**
 * ดึง Product Master "ทั้งชุด" มาเป็น array เดียว (ไม่ใช่ทีละ SKU) — ใช้คู่กับ useCachedData
 * เพื่อ cache ไว้ lookup ในเครื่องแทนการยิง network หาทีละ SKU ทุกครั้งที่สแกน (ช้ามาก)
 *
 * - สาขาห้าง: รวม ProductMasterBooth + ProductMasterFridge เป็นชุดเดียว
 * - สาขาบริษัท: รวม StockCountBaseline ของวันนี้ (fallback) + ProductMasterCompany (หลัก)
 *   ถ้า SKU ซ้ำกันทั้ง 2 แหล่ง ProductMasterCompany ชนะเสมอ (ใส่ทีหลังทับ)
 *
 * sku ทุกตัวถูก uppercase ไว้ตั้งแต่จุดนี้ — กันปัญหาพนักงานพิมพ์ตัวพิมพ์เล็ก/ใหญ่ปนกัน
 * แล้วมองเป็นสินค้าคนละตัว (คู่กับ parseScannedCode.js ที่ uppercase ฝั่ง input เช่นกัน)
 */
export async function fetchProductMasterEntries(branchType, branchCode) {
  if (branchType === 'ห้าง') {
    const [booth, fridge] = await Promise.all([readSheet('ProductMasterBooth'), readSheet('ProductMasterFridge')])
    const map = new Map()
    booth.forEach((r) => addEntry(map, mapMasterRow(r)))
    fridge.forEach((r) => addEntry(map, mapMasterRow(r)))
    return Array.from(map.values())
  }

  const [baseline, company] = await Promise.all([
    readSheet('StockCountBaseline', { สาขา: branchCode, วันที่นำเข้า: todayKey() }),
    readSheet('ProductMasterCompany')
  ])
  const map = new Map()
  baseline.forEach((r) => addEntry(map, mapCompanyMasterRow(r))) // fallback ใส่ก่อน
  company.forEach((r) => addEntry(map, mapCompanyMasterRow(r))) // master หลักใส่ทีหลังทับ
  return Array.from(map.values())
}

function addEntry(map, entry) {
  if (entry.sku) map.set(entry.sku, entry)
}

export function mapMasterRow(row) {
  return { sku: String(row['รหัส'] || '').trim().toUpperCase(), name: row['ชื่อไทย'], unit: row['หน่วย'] || '' }
}

export function mapCompanyMasterRow(row) {
  return {
    sku: String(row['รหัสสินค้า'] || '').trim().toUpperCase(),
    name: row['ชื่อสินค้า'],
    unit: row['หน่วย'] || row['หน่วยนับ หน้าร้าน'] || row['หน่วยนับหลัก'] || ''
  }
}

// แปลง array ที่ cache ไว้กลับเป็น Map ใช้ lookup แบบ O(1) (เก็บเป็น array ใน localStorage
// เพราะ JSON ไม่รองรับ Map โดยตรง แปลงกลับเป็น Map ตอนใช้งานจริงแทน)
export function toLookupMap(entries) {
  const map = new Map()
  ;(entries || []).forEach((e) => map.set(e.sku, e))
  return map
}
