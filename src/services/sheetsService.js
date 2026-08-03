// ============================================================================
// Service Layer: เชื่อมต่อ Google Apps Script Web App (ตัวกลางแทน Google Sheets)
// ทุกโมดูลต้องเรียกผ่านไฟล์นี้เท่านั้น ห้ามยิง fetch ตรงจากคอมโพเนนต์
// เหตุผล: ปรับ endpoint/retry/error-handling ทีเดียวจบ ไม่ต้องไล่แก้ทุกหน้า
//
// วิธี deploy Apps Script + ตั้งค่า URL ดูที่ /apps-script/README.md
// ============================================================================
import { newTransactionId } from '../utils/transactionId'

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || ''

const MAX_RETRY = 5
const BASE_DELAY_MS = 800 // exponential backoff เริ่มที่ ~0.8s

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

class SheetsServiceError extends Error {
  constructor(message, { retriable = false, raw = null } = {}) {
    super(message)
    this.name = 'SheetsServiceError'
    this.retriable = retriable
    this.raw = raw
  }
}

/**
 * เรียก Apps Script Web App ผ่าน POST เท่านั้น (GET ใช้ไม่ได้กับ payload ใหญ่)
 * ใช้ Content-Type: text/plain โดยตั้งใจ — เพื่อเลี่ยง CORS preflight (OPTIONS)
 * ที่ Apps Script ไม่รองรับ ฝั่ง Apps Script จะ parse JSON จาก e.postData.contents เอง
 */
async function callAppsScript(action, payload = {}, { retry = true } = {}) {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsServiceError(
      'ยังไม่ได้ตั้งค่า VITE_APPS_SCRIPT_URL — ดูวิธีตั้งค่าใน apps-script/README.md',
      { retriable: false }
    )
  }

  const body = JSON.stringify({ action, payload })
  let attempt = 0

  while (true) {
    attempt += 1
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      })

      if (res.status === 429) {
        if (retry && attempt < MAX_RETRY) {
          const delay = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 300
          await sleep(delay)
          continue
        }
        throw new SheetsServiceError('ระบบมีผู้ใช้งานพร้อมกันเยอะ กรุณาลองใหม่อีกครั้ง', { retriable: true })
      }

      if (!res.ok) {
        throw new SheetsServiceError(`เชื่อมต่อไม่สำเร็จ (HTTP ${res.status})`, { retriable: true })
      }

      const json = await res.json()
      if (!json.ok) {
        throw new SheetsServiceError(json.error || 'เกิดข้อผิดพลาดจากระบบ', { retriable: false, raw: json })
      }
      return json.data
    } catch (err) {
      const isNetworkError = err instanceof TypeError // fetch throws TypeError เมื่อเน็ตหลุด
      if ((isNetworkError || err.retriable) && retry && attempt < MAX_RETRY) {
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 300
        await sleep(delay)
        continue
      }
      if (err instanceof SheetsServiceError) throw err
      throw new SheetsServiceError(
        isNetworkError ? 'เน็ตหลุดหรือเชื่อมต่อไม่ได้ กรุณาตรวจสอบสัญญาณแล้วลองใหม่' : err.message,
        { retriable: isNetworkError }
      )
    }
  }
}

// ---- Auth / Branches -------------------------------------------------

// ดึงรายชื่อสาขาแบบ dynamic จาก Tab "Branches" — เรียกทุกครั้งที่เข้าหน้า Login ไม่ cache ถาวร
export async function getBranches() {
  return callAppsScript('getBranches')
}

// ตรวจรหัสผ่านสาขา — ฝั่ง Apps Script เป็นคนเทียบ (ไม่ส่งรหัสผ่านทุกสาขามาเทียบฝั่ง client)
export async function verifyBranchLogin(branchCode, password) {
  return callAppsScript('verifyBranchLogin', { branchCode, password })
}

// ---- Generic read/write (ใช้ร่วมกันได้ทุกโมดูล) -----------------------

// อ่านข้อมูลสด ไม่ cache ข้ามหน้าจอ ใช้กับหน้าที่ต้องเห็นข้อมูลล่าสุดเสมอ (diff, สถานะใบ ฯลฯ)
// dateRange: { column, from, to } — จำกัดช่วงวันที่ตอนดูประวัติย้อนหลัง ลดโหลด ไม่ต้องอ่านทั้งตาราง
export async function readSheet(tab, filters = {}, dateRange = null) {
  return callAppsScript('read', { tab, filters, dateRange })
}

/**
 * เขียนหลายแถวแบบ atomic + idempotent
 * - transactionId: ให้ Apps Script เช็คก่อนว่าเคยเขียน batch นี้สำเร็จไปแล้วหรือยัง (กัน retry ซ้ำ)
 * - onceOnlyFilters: ใช้กับปฏิบัติการที่ทำได้ "ครั้งเดียวต่อวันต่อสาขา" (เช่น นับเปิดร้าน/ปิดร้าน/
 *   นับสต๊อก/ล็อกสรุปสิ้นวัน) — Apps Script จะเช็คภายใน lock เดียวกันว่ามีแถวตรงเงื่อนไขนี้อยู่แล้ว
 *   หรือยังก่อนเขียน กัน 2 เครื่องกดยืนยันพร้อมกันแล้วเขียนซ้อนกันทั้งคู่ (เช็คฝั่ง UI อย่างเดียวไม่พอ)
 * - rows: array ของ object ที่ key ตรงกับหัวคอลัมน์ปลายทาง
 * ฝั่ง Apps Script ต้องเขียนด้วย setValues() ทีเดียวทั้งช่วง ไม่ใช้ appendRow วนลูปทีละแถว
 * เพื่อไม่ให้ "เขียนสำเร็จบางแถวค้างไว้กลางทาง" ถ้า error ระหว่างเขียน
 */
export async function writeBatch(tab, rows, { transactionId, onceOnlyFilters } = {}) {
  const txnId = transactionId || newTransactionId(tab)
  return callAppsScript('writeBatch', { tab, rows, transactionId: txnId, onceOnlyFilters })
}

// แก้ไขแถวเดิม — matchFilters ชี้เป้าได้ทั้งทีละแถว (เช่น {rowId}) หรือหลายแถวพร้อมกัน
// (เช่น {สาขา, วันที่บันทึก} ตอนเปลี่ยนสถานะทั้งใบเป็น Shipped) — ใช้เฉพาะจุดที่สเปกอนุญาตเท่านั้น
export async function updateRows(tab, matchFilters, patch, { editReason, editedBy } = {}) {
  return callAppsScript('updateRows', { tab, matchFilters, patch, editReason, editedBy })
}

export async function deleteRows(tab, matchFilters, { editReason, editedBy } = {}) {
  return callAppsScript('deleteRows', { tab, matchFilters, editReason, editedBy })
}

export { SheetsServiceError }
