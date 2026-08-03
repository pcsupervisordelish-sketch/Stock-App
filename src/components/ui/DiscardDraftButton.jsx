import { useState } from 'react'
import Button from './Button'
import ConfirmDialog from './ConfirmDialog'

/**
 * DiscardDraftButton — ปุ่ม "ยกเลิกทั้งหมด" มาตรฐาน ใช้ร่วมกันทุกโมดูลที่มี draft ค้างได้
 * (นับสต๊อก/รับเข้า/บันทึกของเสีย/นับเปิด-ปิดร้าน/ตะกร้าสั่งสินค้า)
 * ล้างแค่ draft ที่ยังไม่ยืนยันส่งข้อมูล (ยังไม่มีอะไรเข้า Sheet) จึงปลอดภัย ไม่ต้องมี audit trail
 */
export default function DiscardDraftButton({ label = 'ยกเลิกทั้งหมด', confirmMessage, onDiscard }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="danger" size="md" fullWidth={false} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={label}
        message={confirmMessage || 'รายการที่กรอกไว้ทั้งหมดจะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ'}
        confirmLabel={label}
        danger
        onConfirm={() => {
          onDiscard()
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
