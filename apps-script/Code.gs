/**
 * ============================================================================
 * ระบบจัดการสต๊อกหน้าร้าน — Apps Script Web App (ตัวกลางระหว่างเว็บกับ Google Sheet)
 * ============================================================================
 * วิธีติดตั้ง: ดู README.md ในโฟลเดอร์เดียวกัน
 *
 * ชื่อ Tab ที่ระบบนี้คาดหวังว่ามีอยู่แล้วใน Spreadsheet (สร้างเองตาม G. โครงสร้าง Google Sheet):
 *   Branches, StockCount, StockCountEditLog, OpeningCount, ClosingCount,
 *   ReceivingIn, ReturnOut, ReturnEditLog, Reconciliation,
 *   OrderBooth, OrderFridge, ProductMasterBooth, ProductMasterFridge
 * + Tab ระบบเพิ่ม 2 อัน (สร้างเองเช่นกัน ใช้ภายในสำหรับกันข้อมูลซ้ำ/เก็บ log แก้ไข):
 *   TransactionLog, EditLog
 *
 * คอลัมน์ของ Tab "Branches" ที่โค้ดนี้อ้างอิง (แถวหัวตารางต้องสะกดตรงเป๊ะ):
 *   รหัสสาขา | ชื่อสาขา | รหัสผ่าน | ประเภทสาขา | สถานะ
 *   - ประเภทสาขา ใช้ค่า "บริษัท" หรือ "ห้าง" เท่านั้น
 *   - สถานะ ใช้ค่า "เปิดใช้งาน" หรือ "ปิดใช้งาน"
 * คอลัมน์ implementation เสริมที่ต้องมีในทุก Tab ที่จะใช้ writeBatch/updateRows/deleteRows
 * (นอกเหนือจากคอลัมน์ธุรกิจตามสเปก G) — เพิ่มเป็นคอลัมน์ท้ายตารางได้เลย:
 *   rowId          → unique ต่อ "แถว" (ฝั่งเว็บ gen ให้ตอนสร้างแต่ละ line item) ใช้ชี้เป้าแก้/ลบทีละแถว
 *   transactionId  → unique ต่อ "batch" ที่เขียนครั้งนั้น (ใช้เช็ค idempotent ตอน retry เท่านั้น
 *                    หลายแถวใน batch เดียวกันจะมีค่านี้ซ้ำกันได้ตามปกติ — อย่าใช้คอลัมน์นี้ชี้เป้าทีละแถว)
 * ============================================================================
 */

const TXN_LOG_TAB = 'TransactionLog'
const EDIT_LOG_TAB = 'EditLog' // fallback สำหรับ Tab ที่ไม่มี log เฉพาะทางตามสเปก G

// Tab ไหนมี edit log เฉพาะทางของตัวเองตามสเปก G ให้ใช้ชื่อนั้น ไม่ปนกับ Tab อื่น
const EDIT_LOG_TAB_MAP = {
  StockCount: 'StockCountEditLog',
  ReturnOut: 'ReturnEditLog'
}
function editLogTabNameFor(tab) {
  return EDIT_LOG_TAB_MAP[tab] || EDIT_LOG_TAB
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function doGet() {
  return jsonOutput({ ok: true, data: { message: 'Stock App API พร้อมใช้งาน (ใช้ POST เท่านั้นสำหรับ action จริง)' } })
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const action = body.action
    const payload = body.payload || {}
    const data = routeAction(action, payload)
    return jsonOutput({ ok: true, data })
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err.message || err) })
  }
}

function routeAction(action, payload) {
  switch (action) {
    case 'getBranches':
      return getBranches()
    case 'verifyBranchLogin':
      return verifyBranchLogin(payload.branchCode, payload.password)
    case 'read':
      return readSheetAsObjects(payload.tab, payload.filters, payload.dateRange)
    case 'writeBatch':
      return writeBatchAtomicIdempotent(payload.tab, payload.rows, payload.transactionId, payload.onceOnlyFilters)
    case 'updateRows':
      return updateRowsWhere(payload.tab, payload.matchFilters, payload.patch, payload.editReason, payload.editedBy)
    case 'deleteRows':
      return deleteRowsWhere(payload.tab, payload.matchFilters, payload.editReason, payload.editedBy)
    default:
      throw new Error('ไม่รู้จัก action: ' + action)
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

// ---------------------------------------------------------------------------
// Branches / Login
// ---------------------------------------------------------------------------

function getBranches() {
  const rows = readSheetAsObjects('Branches')
  // ห้ามส่งรหัสผ่านกลับไปฝั่ง client เด็ดขาด
  return rows
    .filter((r) => r['สถานะ'] !== 'ปิดใช้งาน')
    .map((r) => ({
      branchCode: r['รหัสสาขา'],
      branchName: r['ชื่อสาขา'],
      branchType: r['ประเภทสาขา'],
      active: r['สถานะ'] !== 'ปิดใช้งาน'
    }))
}

function verifyBranchLogin(branchCode, password) {
  const rows = readSheetAsObjects('Branches')
  const match = rows.find((r) => String(r['รหัสสาขา']) === String(branchCode))
  if (!match || match['สถานะ'] === 'ปิดใช้งาน') {
    return { valid: false }
  }
  if (String(match['รหัสผ่าน']) !== String(password)) {
    return { valid: false }
  }
  return {
    valid: true,
    branchCode: match['รหัสสาขา'],
    branchName: match['ชื่อสาขา'],
    branchType: match['ประเภทสาขา']
  }
}

// ---------------------------------------------------------------------------
// Generic read
// ---------------------------------------------------------------------------

function getSheet(tab) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(tab)
  if (!sheet) throw new Error('ไม่พบ Tab ชื่อ "' + tab + '" ในไฟล์ Google Sheet — กรุณาสร้าง Tab นี้ก่อน')
  return sheet
}

function readSheetAsObjects(tab, filters, dateRange) {
  const sheet = getSheet(tab)
  const values = sheet.getDataRange().getValues()
  if (values.length < 1) return []
  const headers = values[0]
  let rows = values.slice(1).map((row) => {
    const obj = {}
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i]
    })
    return obj
  })
  if (filters && Object.keys(filters).length > 0) {
    rows = rows.filter((r) => Object.keys(filters).every((k) => String(r[k]) === String(filters[k])))
  }
  // dateRange: {column, from, to} — เทียบแบบ string ตรงๆ ใช้ได้เพราะ format วันที่เป็น YYYY-MM-DD เสมอ
  if (dateRange && dateRange.column) {
    rows = rows.filter((r) => {
      const v = String(r[dateRange.column] || '')
      if (dateRange.from && v < dateRange.from) return false
      if (dateRange.to && v > dateRange.to) return false
      return true
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Idempotent + atomic batch write
// ---------------------------------------------------------------------------

function isTransactionProcessed(transactionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(TXN_LOG_TAB)
  if (!sheet) {
    sheet = ss.insertSheet(TXN_LOG_TAB)
    sheet.appendRow(['transactionId', 'tab', 'rowCount', 'timestamp'])
    return false
  }
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat()
  return values.includes(transactionId)
}

function logTransaction(transactionId, tab, rowCount) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TXN_LOG_TAB)
  sheet.appendRow([transactionId, tab, rowCount, new Date()])
}

/**
 * เขียนหลายแถวเข้า Tab เดียวกันแบบ atomic (setValues ทีเดียว ไม่วนลูป appendRow)
 * + idempotent (เช็ค transactionId ซ้ำก่อนเขียนเสมอ กัน retry ทำให้แถวซ้อน)
 * + ใช้ LockService กัน concurrent write ชนกันตอนมีหลายเครื่องยิงพร้อมกัน
 * + onceOnlyFilters (optional): เช็คภายใน lock เดียวกันว่ามีแถวที่ตรงเงื่อนไขนี้อยู่แล้วหรือไม่
 *   ก่อนเขียน — ใช้กับปฏิบัติการที่ทำได้ "ครั้งเดียวต่อวันต่อสาขา" เช่น นับเปิดร้าน/ปิดร้าน/
 *   นับสต๊อก/ล็อกสรุปสิ้นวัน กันเคส 2 เครื่องกดยืนยันพร้อมกันแล้วเขียนซ้อนกันทั้งคู่
 *   (เช็คแค่ฝั่ง UI ไม่พอ เพราะ 2 เครื่องอาจเช็ค UI ผ่านพร้อมกันก่อนใครจะเขียนเสร็จ)
 */
function writeBatchAtomicIdempotent(tab, rows, transactionId, onceOnlyFilters) {
  if (!transactionId) throw new Error('ต้องระบุ transactionId ทุกครั้งที่เขียนข้อมูล')
  if (!rows || rows.length === 0) throw new Error('ไม่มีข้อมูลให้เขียน')

  const lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    if (isTransactionProcessed(transactionId)) {
      return { written: 0, skipped: true, reason: 'transactionId นี้เขียนสำเร็จไปแล้ว (idempotent skip)' }
    }

    if (onceOnlyFilters && Object.keys(onceOnlyFilters).length > 0) {
      const already = readSheetAsObjects(tab, onceOnlyFilters)
      if (already.length > 0) {
        return { written: 0, skipped: true, reason: 'มีข้อมูลของเงื่อนไขนี้อยู่แล้ว (เขียนได้ครั้งเดียว) — อีกเครื่องอาจกดยืนยันไปก่อนแล้ว' }
      }
    }

    const sheet = getSheet(tab)
    const lastCol = Math.max(sheet.getLastColumn(), 1)
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]

    // เติมคอลัมน์ transactionId ให้ทุกแถวโดยอัตโนมัติ เพื่อ trace ย้อนหลังได้ว่าแถวไหนมาจาก batch ไหน
    const data = rows.map((row) =>
      headers.map((h) => {
        if (h === 'transactionId') return transactionId
        return row[h] !== undefined && row[h] !== null ? row[h] : ''
      })
    )

    const startRow = sheet.getLastRow() + 1
    sheet.getRange(startRow, 1, data.length, headers.length).setValues(data)
    logTransaction(transactionId, tab, rows.length)

    return { written: rows.length, skipped: false }
  } finally {
    lock.releaseLock()
  }
}

// ---------------------------------------------------------------------------
// แก้ไข/ลบแถวเดิม — ใช้ matchFilters ทั่วไป (เช่น {rowId: 'xxx'} แก้ทีละแถว
// หรือ {สาขา: 'A01', วันที่บันทึก: '2026-08-01'} แก้ทั้งใบพร้อมกันตอน "ยืนยันส่งแล้ว")
// เฉพาะจุดที่สเปกอนุญาตให้แก้ไขแถวเดิม (เช่น A5, C2/C3) ห้ามใช้พร่ำเพรื่อ
// ---------------------------------------------------------------------------

function updateRowsWhere(tab, matchFilters, patch, editReason, editedBy) {
  if (!matchFilters || Object.keys(matchFilters).length === 0) {
    throw new Error('ต้องระบุ matchFilters เพื่อชี้เป้าแถวที่จะแก้ไข (ป้องกันแก้ทั้งตารางโดยไม่ตั้งใจ)')
  }

  const lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    const sheet = getSheet(tab)
    const values = sheet.getDataRange().getValues()
    const headers = values[0]
    const matchCols = Object.keys(matchFilters).map((k) => ({ key: k, index: headers.indexOf(k) }))
    matchCols.forEach((m) => {
      if (m.index === -1) throw new Error('Tab "' + tab + '" ไม่มีคอลัมน์ "' + m.key + '" ให้อ้างอิง')
    })

    let updatedCount = 0
    for (let i = 1; i < values.length; i++) {
      const isMatch = matchCols.every((m) => String(values[i][m.index]) === String(matchFilters[m.key]))
      if (!isMatch) continue

      const before = {}
      const after = {}
      Object.keys(patch).forEach((key) => {
        const colIndex = headers.indexOf(key)
        if (colIndex === -1) return
        before[key] = values[i][colIndex]
        after[key] = patch[key]
        sheet.getRange(i + 1, colIndex + 1).setValue(patch[key])
      })
      appendEditLog(tab, JSON.stringify(matchFilters), before, after, editReason, editedBy)
      updatedCount++
    }

    if (updatedCount === 0) throw new Error('ไม่พบแถวที่ตรงกับเงื่อนไขให้แก้ไข')
    return { updated: updatedCount }
  } finally {
    lock.releaseLock()
  }
}

function deleteRowsWhere(tab, matchFilters, editReason, editedBy) {
  if (!matchFilters || Object.keys(matchFilters).length === 0) {
    throw new Error('ต้องระบุ matchFilters เพื่อชี้เป้าแถวที่จะลบ (ป้องกันลบทั้งตารางโดยไม่ตั้งใจ)')
  }

  const lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    const sheet = getSheet(tab)
    const values = sheet.getDataRange().getValues()
    const headers = values[0]
    const matchCols = Object.keys(matchFilters).map((k) => ({ key: k, index: headers.indexOf(k) }))
    matchCols.forEach((m) => {
      if (m.index === -1) throw new Error('Tab "' + tab + '" ไม่มีคอลัมน์ "' + m.key + '" ให้อ้างอิง')
    })

    // ลบจากแถวล่างขึ้นบน กัน index เลื่อนระหว่างลบหลายแถว
    let deletedCount = 0
    for (let i = values.length - 1; i >= 1; i--) {
      const isMatch = matchCols.every((m) => String(values[i][m.index]) === String(matchFilters[m.key]))
      if (!isMatch) continue
      const rowObj = {}
      headers.forEach((h, idx) => { if (h) rowObj[h] = values[i][idx] })
      appendEditLog(tab, JSON.stringify(matchFilters), rowObj, { deleted: true }, editReason, editedBy)
      sheet.deleteRow(i + 1)
      deletedCount++
    }

    if (deletedCount === 0) throw new Error('ไม่พบแถวที่ตรงกับเงื่อนไขให้ลบ')
    return { deleted: deletedCount }
  } finally {
    lock.releaseLock()
  }
}

function appendEditLog(tab, matchDescription, before, after, editReason, editedBy) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const logTabName = editLogTabNameFor(tab)
  let sheet = ss.getSheetByName(logTabName)
  if (!sheet) {
    sheet = ss.insertSheet(logTabName)
    sheet.appendRow(['timestamp', 'tab', 'เงื่อนไขที่แก้', 'ค่าก่อนแก้', 'ค่าหลังแก้', 'เหตุผล', 'ผู้แก้ไข'])
  }
  sheet.appendRow([new Date(), tab, matchDescription, JSON.stringify(before), JSON.stringify(after), editReason || '', editedBy || ''])
}
