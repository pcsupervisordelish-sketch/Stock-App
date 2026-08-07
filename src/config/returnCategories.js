// หมวดหมู่การบันทึก/ตีคืนสินค้า ตามสเปก C0
// value ตรงกับค่าที่เขียนลงคอลัมน์ "หมวด" ใน Tab ReturnOut ต้องสะกดตรงเป๊ะ
// tone = สีประจำหมวด (แยกสีชัดเจนกันพนักงานกรอกผิดหมวด) — ใช้คู่กับ StatusBadge tone system
export const RETURN_CATEGORIES = [
  {
    value: 'เสียคัดออก',
    label: 'เสียคัดออก',
    group: 'เสีย',
    icon: '🔴',
    tone: 'danger',
    hasPhysicalReturn: true, // มีของจริงส่งกลับคลัง — ต้องมีคนเซ็นรับตอนขนส่งมารับ
    requiresNote: false,
    description: 'มีของจริงส่งกลับคลัง — ต้องมีคนเซ็นรับตอนขนส่งมารับ'
  },
  {
    value: 'เสียทำลายหน้าร้าน',
    label: 'เสียทำลายหน้าร้าน',
    group: 'เสีย',
    icon: '🟠',
    tone: 'warning',
    hasPhysicalReturn: false, // ไม่มีของจริงส่งกลับ ให้คลังตัดยอดอย่างเดียว
    requiresNote: false,
    description: 'ไม่มีของจริงส่งกลับ — ให้คลังตัดยอดอย่างเดียว'
  },
  {
    value: 'แถม',
    label: 'แถม',
    group: null,
    icon: '🎁',
    tone: 'success',
    hasPhysicalReturn: false,
    requiresNote: false,
    description: 'ตัวเลขในหมวดนี้ฝ่ายอื่นเป็นคนจัดการ — บันทึกไว้เพื่ออ้างอิง/กระทบยอด'
  },
  {
    value: 'เคลม',
    label: 'เคลม',
    group: null,
    icon: '🔄',
    tone: 'info',
    hasPhysicalReturn: false,
    requiresNote: false,
    description: 'ลูกค้าขอเคลมแต่ไม่มีของจริงมาเปลี่ยนให้ (ถ้ามีของจริงมาเปลี่ยน ให้บันทึกเป็น "เสีย" แทน)'
  },
  {
    value: 'อื่นๆ',
    label: 'อื่นๆ',
    group: null,
    icon: '❓',
    tone: 'accent',
    hasPhysicalReturn: false,
    requiresNote: true, // บังคับกรอกเหตุผล free text
    description: 'บังคับกรอกเหตุผล'
  }
]

export function getCategory(value) {
  return RETURN_CATEGORIES.find((c) => c.value === value)
}

const NOTE_HISTORY_KEY = 'stockapp_return_note_history'

// เก็บประวัติคำที่เคยพิมพ์ในหมวด "อื่นๆ" ไว้ใช้ autocomplete (frontend-only, เก็บใน localStorage)
export function getNoteHistory() {
  try {
    return JSON.parse(localStorage.getItem(NOTE_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveNoteToHistory(note) {
  if (!note?.trim()) return
  const history = getNoteHistory()
  const next = [note.trim(), ...history.filter((n) => n !== note.trim())].slice(0, 20)
  localStorage.setItem(NOTE_HISTORY_KEY, JSON.stringify(next))
}
