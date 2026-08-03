import { readSheet, writeBatch } from './sheetsService'
import { todayKey, nowTimeLabel } from '../utils/dateUtils'
import { newTransactionId } from '../utils/transactionId'
import { gpsColumns } from '../utils/gpsUtils'

const TAB = 'ReceivingIn'

// B2: ยืนยันส่งข้อมูล — เขียนเข้า ReceivingIn ทีเดียวทั้ง batch (1 แถวต่อ SKU)
// items: [{ sku, name, unit, receivedQty, noteQty }]
export async function submitReceivingBatch(items, { session, gps }) {
  const batchId = newTransactionId('recv')
  const rows = items.map((item) => ({
    วันที่รับ: todayKey(),
    เวลา: nowTimeLabel(),
    สาขา: session.branchCode,
    SKU: item.sku,
    ชื่อสินค้า: item.name,
    หน่วย: item.unit || '',
    จำนวนตามใบส่งของ: item.noteQty,
    จำนวนจริงที่รับ: item.receivedQty,
    'ผลต่าง (ขาด-เกิน)': Number(item.receivedQty) - Number(item.noteQty),
    ผู้ทำรายการ: session.employeeName,
    ...gpsColumns(gps),
    rowId: newTransactionId('row')
  }))
  return writeBatch(TAB, rows, { transactionId: batchId })
}

// F1: list ของ batch รับเข้าที่ส่งแล้ว จัดกลุ่มตาม transactionId (= 1 batch ต่อ 1 ครั้งที่กด submit)
export async function fetchReceivingBatches(branchCode) {
  const rows = await readSheet(TAB, { สาขา: branchCode })
  const byBatch = new Map()
  rows.forEach((r) => {
    const batchId = r.transactionId
    if (!byBatch.has(batchId)) byBatch.set(batchId, [])
    byBatch.get(batchId).push(r)
  })
  return Array.from(byBatch.entries())
    .map(([batchId, batchRows]) => ({ batchId, rows: batchRows, date: batchRows[0]?.['วันที่รับ'], time: batchRows[0]?.['เวลา'] }))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))
}

// D2 (สาขาห้าง): ยอดรับเข้าจริงรวมของวันนี้ ต่อ SKU — ใช้ป้อนสูตรกระทบยอดขาย (D4)
export async function fetchTodayReceivedTotals(branchCode) {
  const rows = await readSheet(TAB, { สาขา: branchCode, วันที่รับ: todayKey() })
  const totals = new Map()
  rows.forEach((r) => {
    const sku = r.SKU
    totals.set(sku, (totals.get(sku) || 0) + Number(r['จำนวนจริงที่รับ'] || 0))
  })
  return totals
}
