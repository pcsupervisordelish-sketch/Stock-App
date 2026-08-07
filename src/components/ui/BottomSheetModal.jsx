import { useKeyboardInset } from '../../hooks/useKeyboardInset'
import './BottomSheetModal.css'

/**
 * BottomSheetModal — popup ลอยขึ้นจากด้านล่างจอ ใช้แทนการสลับเนื้อหาในหน้าเดิม (เดิมสแกนแล้ว
 * เนื้อหาทั้งหน้าเปลี่ยนไปเป็นฟอร์มกรอกจำนวน ทำให้ต้องเลื่อน/หาตำแหน่งใหม่ทุกครั้ง) — ตอนนี้กล้อง/
 * ลิสต์ด้านหลังยังอยู่ที่เดิมเสมอ popup แค่ลอยทับด้านบนแล้วหายไปเมื่อทำรายการเสร็จ
 *
 * - ปิดได้ด้วยการแตะพื้นหลัง (backdrop) หรือเรียก onClose จากปุ่มยกเลิกภายใน children เอง
 * - ขยับหนีคีย์บอร์ดมือถืออัตโนมัติ (เหมือน ConfirmDialog)
 * - z-index ต่ำกว่า ConfirmDialog เล็กน้อย เพื่อให้ dialog ยืนยัน (เช่น เจอ SKU ซ้ำ) ลอยทับ popup นี้ได้อีกชั้น
 */
export default function BottomSheetModal({ open, onClose, children }) {
  const keyboardInset = useKeyboardInset()
  if (!open) return null

  return (
    <div className="bottom-sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="bottom-sheet-box"
        style={{ marginBottom: keyboardInset }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}
