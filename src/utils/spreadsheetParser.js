import * as XLSX from 'xlsx'
import { normalizeHeader } from '../config/stockCountMapping'

// parse ไฟล์ที่อัปโหลด (.xlsx, .xls, .csv) -> { headers, rows } (rows เป็น array of array ดิบ ไม่รวมแถวหัว)
export async function parseSpreadsheetFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  return splitHeaderAndRows(data)
}

// parse ข้อความที่ paste มาจาก SAP (tab-separated) -> { headers, rows }
export function parseTsvText(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0)
  const data = lines.map((line) => line.split('\t'))
  return splitHeaderAndRows(data)
}

function splitHeaderAndRows(data) {
  if (!data || data.length === 0) return { headers: [], rows: [] }
  const headers = data[0].map((h) => normalizeHeader(h))
  const rows = data.slice(1).map((row) => row.map((cell) => normalizeHeader(cell)))
  return { headers, rows }
}
