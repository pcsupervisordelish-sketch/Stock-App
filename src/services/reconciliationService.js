import { readSheet, writeBatch } from './sheetsService'
import { fetchDeptCountMap } from './deptCountService'
import { todayKey, daysAgoKey } from '../utils/dateUtils'
import { newTransactionId } from '../utils/transactionId'
import { gpsColumns } from '../utils/gpsUtils'

const RECON_TAB = 'Reconciliation'

// หมวดที่ต้องหักออกจากสูตรกระทบยอด (D4 ข้อ 4 — หักครบทุกหมวดที่ของออกจากสต๊อกโดยไม่ใช่การขาย)
const DEDUCT_CATEGORIES = ['เสียคัดออก', 'เสียทำลายหน้าร้าน', 'แถม', 'เคลม', 'อื่นๆ']

// รวมยอดรับเข้าจริงของวันนั้น ต่อ SKU (อาจมีหลาย batch ในวันเดียว)
async function fetchReceivedTotalsForDate(branchCode, dateKey) {
  const rows = await readSheet('ReceivingIn', { สาขา: branchCode, วันที่รับ: dateKey })
  const totals = new Map()
  rows.forEach((r) => {
    const sku = r.SKU
    const entry = totals.get(sku) || { qty: 0, name: r['ชื่อสินค้า'], unit: r['หน่วย'] }
    entry.qty += Number(r['จำนวนจริงที่รับ'] || 0)
    totals.set(sku, entry)
  })
  return totals
}

// รวมยอดตีคืนของวันนั้น (อิงตาม "วันที่บันทึก" ที่เจอของเสียจริง ไม่ใช่วันที่ Shipped ตามหลักการ D3)
// คืนเป็น Map<sku, { name, unit, byCategory: {หมวด: qty} }>
async function fetchReturnTotalsForDate(branchCode, dateKey) {
  const rows = await readSheet('ReturnOut', { สาขา: branchCode, วันที่บันทึก: dateKey })
  const totals = new Map()
  rows.forEach((r) => {
    const sku = r.SKU
    const entry = totals.get(sku) || { name: r['ชื่อสินค้า'], unit: r['หน่วย'], byCategory: {} }
    const cat = r['หมวด']
    entry.byCategory[cat] = (entry.byCategory[cat] || 0) + Number(r['จำนวน'] || 0)
    totals.set(sku, entry)
  })
  return totals
}

/**
 * D4: คำนวณกระทบยอดของวันที่ระบุ — รวมข้อมูลจาก OpeningCount, ReceivingIn, ReturnOut, ClosingCount
 * คืนเป็น array ต่อ SKU พร้อมทุกคอลัมน์ตาม Format ที่แนบ (ควรจะเหลือ/ยอดขายได้โดยประมาณ/Diff/สถานะ)
 */
export async function computeReconciliation(branchCode, dateKey = todayKey()) {
  const [openingMap, closingMap, receivedMap, returnMap] = await Promise.all([
    fetchDeptCountMap('opening', branchCode, dateKey),
    fetchDeptCountMap('closing', branchCode, dateKey),
    fetchReceivedTotalsForDate(branchCode, dateKey),
    fetchReturnTotalsForDate(branchCode, dateKey)
  ])

  const allSkus = new Set([...openingMap.keys(), ...closingMap.keys(), ...receivedMap.keys(), ...returnMap.keys()])

  return Array.from(allSkus).map((sku) => {
    const opening = openingMap.get(sku)
    const closing = closingMap.get(sku)
    const received = receivedMap.get(sku)
    const ret = returnMap.get(sku)
    const byCategory = ret?.byCategory || {}

    const openingQty = opening?.qty || 0
    const receivedQty = received?.qty || 0
    const closingQty = closing?.qty || 0
    const deductTotal = DEDUCT_CATEGORIES.reduce((sum, cat) => sum + (byCategory[cat] || 0), 0)

    const shouldRemain = openingQty + receivedQty - deductTotal
    const estimatedSales = shouldRemain - closingQty
    const diff = closingQty - shouldRemain
    const status = diff === 0 ? 'ถูกต้อง' : diff > 0 ? 'ของเกิน' : 'ของหาย'

    const name = closing?.name || opening?.name || received?.name || ret?.name || ''
    const unit = closing?.unit || opening?.unit || received?.unit || ret?.unit || ''

    return {
      sku,
      name,
      unit,
      opening: openingQty,
      received: receivedQty,
      เสียคัดออก: byCategory['เสียคัดออก'] || 0,
      เสียทำลายหน้าร้าน: byCategory['เสียทำลายหน้าร้าน'] || 0,
      แถม: byCategory['แถม'] || 0,
      เคลม: byCategory['เคลม'] || 0,
      อื่นๆ: byCategory['อื่นๆ'] || 0,
      shouldRemain,
      closing: closingQty,
      estimatedSales,
      diff,
      status
    }
  })
}

// D6: สถานะของวันที่ระบุ — ใช้ตัดสินใจว่า "เข้าไปดู" แล้วจะล็อกได้ไหม หรือดูอย่างเดียว (ล็อกไปแล้ว)
export async function fetchDailyClosingStatus(branchCode, dateKey) {
  const [openingRows, closingRows, reconRows] = await Promise.all([
    readSheet('OpeningCount', { สาขา: branchCode, วันที่: dateKey }),
    readSheet('ClosingCount', { สาขา: branchCode, วันที่: dateKey }),
    readSheet(RECON_TAB, { สาขา: branchCode, วันที่: dateKey })
  ])
  return {
    date: dateKey,
    openingDone: openingRows.length > 0,
    closingDone: closingRows.length > 0,
    locked: reconRows.length > 0
  }
}

// D6: list สถานะของ N วันล่าสุด ให้เลือกเข้าไปดู/ล็อก
export async function fetchRecentClosingStatuses(branchCode, { days = 7 } = {}) {
  const dates = Array.from({ length: days }, (_, i) => daysAgoKey(i))
  const statuses = await Promise.all(dates.map((d) => fetchDailyClosingStatus(branchCode, d)))
  return statuses
}

// D6: ล็อกสรุปสิ้นวัน — เขียนผลคำนวณเข้า Reconciliation ทีเดียวทั้งวัน (ถาวร แก้ไขไม่ได้อีก)
export async function lockDailyClosing(branchCode, dateKey, computedRows, { employeeName, gps }) {
  const rows = computedRows.map((r) => ({
    รหัสสินค้า: r.sku,
    ชื่อสินค้า: r.name,
    สาขา: branchCode,
    วันที่: dateKey,
    นับเปิดร้าน: r.opening,
    รับเข้า: r.received,
    เสียคัดออก: r['เสียคัดออก'],
    เสียทำลายหน้าร้าน: r['เสียทำลายหน้าร้าน'],
    แถม: r['แถม'],
    เคลม: r['เคลม'],
    อื่นๆ: r['อื่นๆ'],
    ควรจะเหลือ: r.shouldRemain,
    นับปิดร้านจริง: r.closing,
    'ขายได้ (ที่คำนวนได้ตามจริง)': r.estimatedSales,
    'หายจากการบันทึก (Diff)': r.diff,
    สถานะ: r.status,
    ผู้ทำรายการ: employeeName,
    สถานะล็อก: 'ล็อกแล้ว',
    ...gpsColumns(gps),
    rowId: newTransactionId('row')
  }))
  return writeBatch(RECON_TAB, rows, {
    transactionId: newTransactionId('recon'),
    onceOnlyFilters: { สาขา: branchCode, วันที่: dateKey }
  })
}

// F3: list วันที่ที่ล็อกแล้วทั้งหมด (มีข้อมูลใน Reconciliation) ให้เลือกปริ้น
export async function fetchLockedReconciliationDates(branchCode) {
  const rows = await readSheet(RECON_TAB, { สาขา: branchCode })
  const byDate = new Map()
  rows.forEach((r) => {
    const date = r['วันที่']
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(r)
  })
  return Array.from(byDate.entries())
    .map(([date, dateRows]) => ({ date, rows: dateRows }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

// D5: Anomaly Flag — เทียบยอดขายได้โดยประมาณวันนี้กับค่าเฉลี่ย 30 วันย้อนหลังต่อ SKU
export async function fetchAnomalyFlags(branchCode, computedRows, { historyDays = 30 } = {}) {
  const history = await readSheet(RECON_TAB, { สาขา: branchCode }, { column: 'วันที่', from: daysAgoKey(historyDays) })
  const salesBySku = new Map()
  history.forEach((r) => {
    const sku = r['รหัสสินค้า']
    if (!salesBySku.has(sku)) salesBySku.set(sku, [])
    salesBySku.get(sku).push(Number(r['ขายได้ (ที่คำนวนได้ตามจริง)'] || 0))
  })

  const flags = new Map()
  computedRows.forEach((r) => {
    const history30 = salesBySku.get(r.sku)
    if (!history30 || history30.length < 3) return // ข้อมูลน้อยเกินไป ยังฟันธงไม่ได้
    const avg = history30.reduce((a, b) => a + b, 0) / history30.length
    const threshold = Math.max(avg * 0.5, 3)
    if (Math.abs(r.estimatedSales - avg) > threshold) {
      flags.set(r.sku, { avg: Math.round(avg * 10) / 10, today: r.estimatedSales })
    }
  })
  return flags
}

// D7: สต๊อกคำนวณสดของ "วันนี้" (ก่อนปิดร้าน) = เปิดร้าน + รับเข้าสะสม(จริง) − สินค้าออกทุกหมวดสะสม
export async function fetchCurrentEstimatedStock(branchCode) {
  const dateKey = todayKey()
  const [openingMap, receivedMap, returnMap] = await Promise.all([
    fetchDeptCountMap('opening', branchCode, dateKey),
    fetchReceivedTotalsForDate(branchCode, dateKey),
    fetchReturnTotalsForDate(branchCode, dateKey)
  ])
  const allSkus = new Set([...openingMap.keys(), ...receivedMap.keys(), ...returnMap.keys()])

  return Array.from(allSkus).map((sku) => {
    const opening = openingMap.get(sku)
    const received = receivedMap.get(sku)
    const ret = returnMap.get(sku)
    const byCategory = ret?.byCategory || {}
    const deductTotal = DEDUCT_CATEGORIES.reduce((sum, cat) => sum + (byCategory[cat] || 0), 0)
    const estimatedCurrentStock = (opening?.qty || 0) + (received?.qty || 0) - deductTotal
    return {
      sku,
      name: opening?.name || received?.name || ret?.name || '',
      unit: opening?.unit || received?.unit || ret?.unit || '',
      estimatedCurrentStock
    }
  })
}
