import { readSheet, writeBatch, updateRows } from './sheetsService'
import { todayKey, daysAgoKey } from '../utils/dateUtils'
import { newTransactionId } from '../utils/transactionId'
import { gpsColumns } from '../utils/gpsUtils'

const BASELINE_TAB = 'StockCountBaseline'
const COUNT_TAB = 'StockCount'

// A1: เช็คว่ามี baseline ของวันนี้ให้สาขานี้แล้วหรือยัง (ใช้บล็อกไม่ให้เข้าหน้าสแกนถ้ายังไม่ import)
export async function fetchTodayBaseline(branchCode) {
  const rows = await readSheet(BASELINE_TAB, { สาขา: branchCode, วันที่นำเข้า: todayKey() })
  return rows.map((r) => ({
    // uppercase เสมอ — สอดคล้องกับ parseScannedCode.js ที่ uppercase ฝั่ง input กันตัวพิมพ์
    // เล็ก/ใหญ่ปนกันแล้วหา SKU ในแคชไม่เจอ (ระบบมองเป็นสินค้าคนละตัว)
    sku: String(r['รหัสสินค้า'] || '').trim().toUpperCase(),
    name: r['ชื่อสินค้า'],
    whCode: r['รหัสคลัง'],
    whName: r['คลังสินค้า'],
    sapQtySystem: r['จำนวนในระบบ'],
    mainUnit: r['หน่วยนับหลัก'],
    convertUnit: r['หน่วย Convert'],
    sapQtyFront: Number(r['จำนวนหน้าร้าน'] || 0),
    frontUnit: r['หน่วยนับ หน้าร้าน']
  }))
}

// A1: import baseline จากไฟล์/paste ที่ mapping คอลัมน์แล้ว -> เขียนเข้า StockCountBaseline (append-only)
// mappedRows: array of object ที่ key ตรงกับ BASELINE_FIELDS.key แล้ว
export async function importBaseline(mappedRows, { session, gps }) {
  const dateKey = todayKey()
  const batchId = newTransactionId('baseline')

  const rows = mappedRows.map((r) => ({
    วันที่นำเข้า: dateKey,
    สาขา: session.branchCode,
    รหัสสินค้า: r['รหัสสินค้า'],
    ชื่อสินค้า: r['ชื่อสินค้า'],
    รหัสคลัง: r['รหัสคลัง'] || '',
    คลังสินค้า: r['คลังสินค้า'] || '',
    จำนวนในระบบ: r['จำนวนในระบบ'] || '',
    หน่วยนับหลัก: r['หน่วยนับหลัก'] || '',
    'หน่วย Convert': r['หน่วย Convert'] || '',
    จำนวนหน้าร้าน: r['จำนวนหน้าร้าน'] || 0,
    'หน่วยนับ หน้าร้าน': r['หน่วยนับ หน้าร้าน'] || '',
    ผู้นำเข้า: session.employeeName,
    ...gpsColumns(gps),
    rowId: newTransactionId('row')
  }))

  return writeBatch(BASELINE_TAB, rows, { transactionId: batchId })
}

// A3: เช็คว่าวันนี้ส่งข้อมูลนับสต๊อกไปแล้วหรือยัง (ล็อกไม่ให้เข้าหน้าสแกนซ้ำ)
export async function hasTodaySubmittedCount(branchCode) {
  const rows = await readSheet(COUNT_TAB, { สาขา: branchCode, วันที่นับ: todayKey() })
  return rows.length > 0
}

// A3: ยืนยันส่งข้อมูล — คำนวณ diff แล้วเขียนเข้า StockCount (1 แถวต่อ SKU)
// items: [{ sku, name, whCode, whName, sapQtySystem, mainUnit, convertUnit, sapQtyFront, frontUnit, countedQty, offBaseline }]
export async function submitCount(items, { session, gps }) {
  const dateKey = todayKey()
  const rows = items.map((item) => ({
    รหัสสินค้า: item.sku,
    ชื่อสินค้า: item.name,
    รหัสคลัง: item.whCode || '',
    คลังสินค้า: item.whName || '',
    'จำนวนในระบบ SAP': item.sapQtySystem ?? '',
    หน่วยนับหลัก: item.mainUnit || '',
    'หน่วย Convert': item.convertUnit || '',
    'จำนวนหน้าร้าน SAP': item.sapQtyFront ?? 0,
    'หน่วยนับ หน้าร้าน': item.frontUnit || '',
    'นับจริง (รับข้อมูลจากการนับ)': item.countedQty,
    'ผลต่าง Diff': Number(item.countedQty) - Number(item.sapQtyFront || 0),
    วันที่นับ: dateKey,
    สาขา: session.branchCode,
    ผู้ทำรายการ: session.employeeName,
    สถานะ: 'ยืนยันแล้ว',
    ไม่พบในไฟล์SAP: item.offBaseline ? 'ใช่' : '',
    ...gpsColumns(gps),
    rowId: newTransactionId('row')
  }))
  return writeBatch(COUNT_TAB, rows, {
    onceOnlyFilters: { สาขา: session.branchCode, วันที่นับ: dateKey }
  })
}

// A6: ผลการนับของวันที่ระบุ (default วันนี้)
export async function fetchDiffReport(branchCode, dateKey = todayKey()) {
  return readSheet(COUNT_TAB, { สาขา: branchCode, วันที่นับ: dateKey })
}

// A5: แก้ไขยอดนับหลังส่งเข้า Sheet แล้ว — baseline ฝั่ง SAP คงที่ไม่แก้ แก้ได้แค่ "นับจริง" + diff คำนวณใหม่
export async function editCountedQty(rowId, newQty, sapQtyFront, { editedBy, editReason }) {
  const newDiff = Number(newQty) - Number(sapQtyFront || 0)
  return updateRows(
    COUNT_TAB,
    { rowId },
    { 'นับจริง (รับข้อมูลจากการนับ)': newQty, 'ผลต่าง Diff': newDiff },
    { editedBy, editReason }
  )
}

// A4: Smart Alert — SKU ใน baseline วันนี้ที่ "ไม่ถูกนับ" แบ่งเป็นต้องดู/เงียบยาว จากประวัติย้อนหลัง
export async function fetchMissingSkuAlert(branchCode, baseline, countedSkuSet, { historyDays = 45, activeThreshold = 5 } = {}) {
  const missing = baseline.filter((b) => !countedSkuSet.has(b.sku))
  if (missing.length === 0) return { needsReview: [], longQuiet: [] }

  const history = await readSheet(
    COUNT_TAB,
    { สาขา: branchCode },
    { column: 'วันที่นับ', from: daysAgoKey(historyDays) }
  )

  const activeCountBySku = new Map()
  history.forEach((r) => {
    const qty = Number(r['นับจริง (รับข้อมูลจากการนับ)'] || 0)
    if (qty > 0) {
      const sku = r['รหัสสินค้า']
      activeCountBySku.set(sku, (activeCountBySku.get(sku) || 0) + 1)
    }
  })

  const needsReview = []
  const longQuiet = []
  missing.forEach((b) => {
    const activeDays = activeCountBySku.get(b.sku) || 0
    if (activeDays >= activeThreshold) needsReview.push({ ...b, activeDays })
    else longQuiet.push({ ...b, activeDays })
  })

  return { needsReview, longQuiet }
}

// F4: list วันที่/รอบที่ยืนยันส่งข้อมูลนับสต๊อกแล้วทั้งหมด ให้เลือกปริ้น
export async function fetchSubmittedCountDates(branchCode) {
  const rows = await readSheet(COUNT_TAB, { สาขา: branchCode })
  const byDate = new Map()
  rows.forEach((r) => {
    const date = r['วันที่นับ']
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(r)
  })
  return Array.from(byDate.entries())
    .map(([date, dateRows]) => ({ date, rows: dateRows }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

// A7: ประวัติย้อนหลัง — สรุปแนวโน้ม diff ต่อวัน
export async function fetchCountHistorySummary(branchCode, { days = 60 } = {}) {
  const rows = await readSheet(COUNT_TAB, { สาขา: branchCode }, { column: 'วันที่นับ', from: daysAgoKey(days) })
  const byDate = new Map()
  rows.forEach((r) => {
    const date = r['วันที่นับ']
    if (!byDate.has(date)) byDate.set(date, { date, skuCount: 0, totalAbsDiff: 0, abnormalCount: 0 })
    const agg = byDate.get(date)
    const diff = Number(r['ผลต่าง Diff'] || 0)
    agg.skuCount += 1
    agg.totalAbsDiff += Math.abs(diff)
    if (Math.abs(diff) >= 3) agg.abnormalCount += 1
  })
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
}
