import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import Button from '../ui/Button'

/**
 * PrintExportActions — ปุ่มคู่มาตรฐานของโมดูล F ทุกหมวด (ตาม F5)
 * รับ printVersion (ผลจาก usePrintVersion ที่เรียกไว้แล้วในหน้า parent — ยกขึ้นมาไว้ข้างนอก
 * เพื่อให้ DocumentHeader ในหน้าเดียวกันเห็น log เดียวกันได้ ไม่ต้องเรียก hook ซ้ำซ้อน)
 * printAreaRef: ref ของ DOM ที่จะปริ้น/แปลงเป็นรูป (ต้องครอบด้วย className="print-area")
 */
export default function PrintExportActions({ printAreaRef, printVersion, filename = 'document' }) {
  const { staleSincePrint, recordPrint, log } = printVersion
  const { show } = useToast()
  const [sharing, setSharing] = useState(false)

  const handlePrint = () => {
    recordPrint()
    setTimeout(() => window.print(), 50)
  }

  const handleShareImage = async () => {
    setSharing(true)
    try {
      recordPrint()
      await new Promise((r) => setTimeout(r, 60)) // รอ header re-render เวลาพิมพ์ล่าสุดก่อน capture
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(printAreaRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('สร้างรูปภาพไม่สำเร็จ')

      const file = new File([blob], `${filename}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.png`
        a.click()
        URL.revokeObjectURL(url)
        show('เบราว์เซอร์นี้แชร์ตรงไม่ได้ ดาวน์โหลดรูปภาพให้แทน', { type: 'info' })
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        show(err.message || 'บันทึกรูปภาพ/แชร์ไม่สำเร็จ กรุณาลองใหม่', { type: 'error' })
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div>
      {staleSincePrint && log && (
        <div style={{ background: 'var(--color-warning-bg)', color: '#7A5B00', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 14 }}>
          ⚠️ เอกสารนี้เคยปริ้น/แชร์ไปแล้วเมื่อ {new Date(log.lastPrintedAt).toLocaleString('th-TH', { calendar: 'gregory' })} และข้อมูลมีการเปลี่ยนแปลงหลังจากนั้น
          กรุณาปริ้น/แชร์ใหม่เพื่อให้ตรงกับข้อมูลล่าสุด
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="secondary" onClick={handlePrint}>🖨️ ปริ้น</Button>
        <Button onClick={handleShareImage} loading={sharing} loadingText="กำลังสร้างรูปภาพ...">
          📷 บันทึกรูปภาพ/แชร์
        </Button>
      </div>
    </div>
  )
}
