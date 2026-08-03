import { readSheet, writeBatch, updateRows, deleteRows } from './sheetsService'
import { lookupProduct } from './productLookup'
import { todayKey, daysPending } from '../utils/dateUtils'
import { newTransactionId } from '../utils/transactionId'
import { gpsColumns } from '../utils/gpsUtils'

const TAB = 'ReturnOut'

export { lookupProduct }

export function buildSlipNumber(branchCode, dateKey) {
  return `RET-${branchCode}-${dateKey.replace(/-/g, '')}`
}

/**
 * ยืนยันรายการ (Draft -> เขียนเข้า Sheet เป็น Confirmed)
 * items: [{ sku, name, unit, category, quantity, note }]
 */
export async function confirmDraftBatch(items, { session, gps }) {
  const dateKey = todayKey()
  const slipNumber = buildSlipNumber(session.branchCode, dateKey)

  const rows = items.map((item) => ({
    วันที่บันทึก: dateKey,
    เลขที่ใบ: slipNumber,
    สาขา: session.branchCode,
    SKU: item.sku,
    ชื่อสินค้า: item.name,
    จำนวน: item.quantity,
    หน่วย: item.unit || '',
    หมวด: item.category,
    หมายเหตุ: item.note || '',
    'วันที่ Shipped จริง': '',
    สถานะ: 'Confirmed',
    ผู้ทำรายการ: session.employeeName,
    ...gpsColumns(gps),
    rowId: newTransactionId('row')
  }))

  return writeBatch(TAB, rows)
}

// รายการที่ยืนยันแล้ววันนี้ (จากทุกเครื่องที่ยืนยันมาแล้ว) — ใช้แสดงสรุป/กันสแกนซ้ำข้ามเครื่อง
export async function fetchTodayConfirmedItems(branchCode) {
  return readSheet(TAB, { สาขา: branchCode, วันที่บันทึก: todayKey() })
}

// C3: รายการที่ยังไม่ปิดรอบ — group เป็น "ใบ" ต่อวัน จากแถวสถานะ Confirmed ทั้งหมดของสาขา
export async function fetchPendingSlips(branchCode) {
  const rows = await readSheet(TAB, { สาขา: branchCode, สถานะ: 'Confirmed' })
  const byDate = new Map()
  rows.forEach((r) => {
    const date = r['วันที่บันทึก']
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(r)
  })

  return Array.from(byDate.entries())
    .map(([date, dateRows]) => {
      const categorySummary = {}
      dateRows.forEach((r) => {
        categorySummary[r['หมวด']] = (categorySummary[r['หมวด']] || 0) + Number(r['จำนวน'] || 0)
      })
      return {
        date,
        pending: daysPending(date),
        rows: dateRows,
        categorySummary
      }
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

// C3: ยืนยันส่งแล้ว — เปลี่ยนสถานะทุกแถวของวันที่เลือกเป็น Shipped
export async function shipSlipDate(branchCode, date, { editedBy } = {}) {
  return updateRows(
    TAB,
    { สาขา: branchCode, วันที่บันทึก: date },
    { สถานะ: 'Shipped', 'วันที่ Shipped จริง': todayKey() },
    { editedBy, editReason: 'ยืนยันส่งแล้ว (C3)' }
  )
}

// C5: ประวัติใบที่ Shipped แล้ว
export async function fetchShippedHistory(branchCode) {
  const rows = await readSheet(TAB, { สาขา: branchCode, สถานะ: 'Shipped' })
  const byDate = new Map()
  rows.forEach((r) => {
    const date = r['วันที่บันทึก']
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(r)
  })
  return Array.from(byDate.entries())
    .map(([date, dateRows]) => ({ date, rows: dateRows }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)) // ล่าสุดก่อน
}

// แก้ไข/ลบรายการเดี่ยวๆ ระหว่างยังไม่ Shipped (ใช้ rowId ที่ผูกไว้ตอนสร้างแถว)
export async function updateLineItemQuantity(rowId, quantity, { editedBy }) {
  return updateRows(TAB, { rowId }, { จำนวน: quantity }, { editedBy, editReason: 'แก้ไขจำนวนรายการ (C)' })
}

export async function deleteLineItem(rowId, { editedBy }) {
  return deleteRows(TAB, { rowId }, { editedBy, editReason: 'ลบรายการ (C)' })
}

// F2: ใบตีคืนทั้งหมดที่พร้อมปริ้น (สถานะ Confirmed ขึ้นไป — ระบบนี้ไม่มี row สถานะ Draft ใน Sheet อยู่แล้ว
// เพราะ Draft เก็บที่ local จนกว่าจะกด "ยืนยันรายการ" ดังนั้นทุกแถวที่มีใน ReturnOut พร้อมปริ้นได้ทันที)
export async function fetchAllSlipsForPrint(branchCode) {
  const rows = await readSheet(TAB, { สาขา: branchCode })
  const byDate = new Map()
  rows.forEach((r) => {
    const date = r['วันที่บันทึก']
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(r)
  })
  return Array.from(byDate.entries())
    .map(([date, dateRows]) => ({ date, rows: dateRows }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}
