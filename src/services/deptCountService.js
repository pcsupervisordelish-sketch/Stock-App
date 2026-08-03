import { readSheet, writeBatch } from './sheetsService'
import { todayKey } from '../utils/dateUtils'
import { newTransactionId } from '../utils/transactionId'
import { gpsColumns } from '../utils/gpsUtils'

const TABS = { opening: 'OpeningCount', closing: 'ClosingCount' }
const QTY_FIELD = { opening: 'จำนวนเปิดร้าน', closing: 'จำนวนปิดร้าน' }

export function deptCountDraftKey(type, branchCode) {
  return `deptcount:${type}:${branchCode}:${todayKey()}`
}

// D1: เช็คว่าวันนี้ทำ "นับเปิดร้าน" หรือ "นับปิดร้าน" เสร็จไปแล้วหรือยัง
export async function hasSubmittedToday(type, branchCode) {
  const rows = await readSheet(TABS[type], { สาขา: branchCode, วันที่: todayKey() })
  return rows.length > 0
}

// D1: ยืนยันส่งข้อมูล — เขียนเข้า OpeningCount หรือ ClosingCount (1 แถวต่อ SKU)
// items: [{ sku, name, unit, quantity }]
export async function submitDeptCount(type, items, { session, gps }) {
  const rows = items.map((item) => ({
    วันที่: todayKey(),
    สาขา: session.branchCode,
    รหัสสินค้า: item.sku,
    ชื่อสินค้า: item.name,
    หน่วย: item.unit || '',
    [QTY_FIELD[type]]: item.quantity,
    ผู้ทำรายการ: session.employeeName,
    ...gpsColumns(gps),
    rowId: newTransactionId('row')
  }))
  return writeBatch(TABS[type], rows, {
    onceOnlyFilters: { สาขา: session.branchCode, วันที่: todayKey() }
  })
}

// ใช้ตอนคำนวณกระทบยอด (D4) และดูสต๊อกปัจจุบัน (D7) — อ่านยอดของวันที่ระบุ คืนเป็น Map<sku, qty>
export async function fetchDeptCountMap(type, branchCode, dateKey = todayKey()) {
  const rows = await readSheet(TABS[type], { สาขา: branchCode, วันที่: dateKey })
  const map = new Map()
  rows.forEach((r) => map.set(r['รหัสสินค้า'], { qty: Number(r[QTY_FIELD[type]] || 0), name: r['ชื่อสินค้า'], unit: r['หน่วย'] }))
  return map
}
