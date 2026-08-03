// นิยาม field ปลายทางที่ระบบต้องการจากไฟล์ SAP Query (A1)
// key = ชื่อคอลัมน์ปลายทางที่ระบบใช้ภายใน, label = ชื่อที่โชว์ในหน้าจับคู่คอลัมน์
// sapDefaultHeader = ชื่อคอลัมน์ที่ SAP Copy Table วางมาให้ตามสเปก (ใช้จับคู่อัตโนมัติเป็นค่าเริ่มต้น)
export const BASELINE_FIELDS = [
  { key: 'รหัสสินค้า', label: 'รหัสสินค้า', sapDefaultHeader: 'รหัสสินค้า', required: true },
  { key: 'ชื่อสินค้า', label: 'ชื่อสินค้า', sapDefaultHeader: 'ชื่อสินค้า', required: true },
  { key: 'รหัสคลัง', label: 'รหัสคลัง', sapDefaultHeader: 'รหัสคลัง', required: false },
  { key: 'คลังสินค้า', label: 'คลังสินค้า', sapDefaultHeader: 'คลังสินค้า', required: false },
  { key: 'จำนวนในระบบ', label: 'จำนวนในระบบ', sapDefaultHeader: 'จำนวนในระบบ', required: false },
  { key: 'หน่วยนับหลัก', label: 'หน่วยนับหลัก', sapDefaultHeader: 'หน่วยนับหลัก', required: false },
  { key: 'หน่วย Convert', label: 'หน่วย Convert', sapDefaultHeader: 'หน่วย Convert', required: false },
  { key: 'จำนวนหน้าร้าน', label: 'จำนวน หน้าร้าน (baseline)', sapDefaultHeader: 'จำนวน หน้าร้าน', required: true },
  { key: 'หน่วยนับ หน้าร้าน', label: 'หน่วยนับ หน้าร้าน', sapDefaultHeader: 'หน่วยนับ หน้าร้าน', required: false }
  // คอลัมน์ "นับจริง" ในไฟล์ SAP ไม่ใช้ — ว่างเปล่าเสมอตามสเปก A1 เว็บเติมเองจากการสแกน
]

// เดา mapping อัตโนมัติจากหัวคอลัมน์ที่เจอในไฟล์ ด้วยการเทียบชื่อแบบตรงเป๊ะก่อน
export function guessMapping(fileHeaders) {
  const mapping = {}
  BASELINE_FIELDS.forEach((field) => {
    const idx = fileHeaders.findIndex((h) => normalizeHeader(h) === normalizeHeader(field.sapDefaultHeader))
    mapping[field.key] = idx !== -1 ? idx : null
  })
  return mapping
}

// sanitize non-breaking space (\xa0) ที่ SAP Copy Table มักแทรกมาในชื่อสินค้า/หัวคอลัมน์
export function normalizeHeader(text) {
  return String(text ?? '').replace(/\u00a0/g, ' ').trim()
}
