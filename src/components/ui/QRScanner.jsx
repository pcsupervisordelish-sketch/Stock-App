import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import './QRScanner.css'

const REGION_ID = 'qr-scanner-region'
const TARGET_ZOOM = 2 // ซูมเป้าหมาย (เท่า) ใช้ลดมุมมองกล้องมือถือที่มักเป็นเลนส์ ultra-wide โดย default

/**
 * QRScanner — สแกน QR ผ่านกล้องเว็บ (มือถือ/Sunmi ไม่มี hardware scanner แยก)
 * ทุกจุดที่ใช้คอมโพเนนต์นี้ต้องมีช่องกรอกรหัสมือสำรองเสมอ (บังคับตามสเปก)
 * onDetected(code: string) จะถูกเรียกทั้งจากการสแกนกล้องและจากการกรอกมือ
 * — ผู้เรียกต้อง parse ด้วย parseScannedCode เองเสมอ (รองรับรูปแบบ "รหัส|น้ำหนัก")
 */
export default function QRScanner({ onDetected, disabled = false }) {
  const [mode, setMode] = useState('camera') // 'camera' | 'manual'
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState(null)
  const scannerRef = useRef(null)
  const hasDetectedRef = useRef(false) // กัน html5-qrcode ยิง onScanSuccess ซ้ำหลายเฟรมสำหรับ QR เดิม

  useEffect(() => {
    if (mode !== 'camera' || disabled) return undefined

    hasDetectedRef.current = false // เริ่ม session สแกนใหม่ทุกครั้ง (mount/mode เปลี่ยน) ต้อง reset guard
    let html5QrCode
    let cancelled = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return
      html5QrCode = new Html5Qrcode(REGION_ID)
      scannerRef.current = html5QrCode
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            // html5-qrcode จะเรียก callback นี้ซ้ำได้หลายเฟรมถ้า QR เดิมยังอยู่ในกล้อง
            // (ทำให้ onDetected อาจถูกยิงซ้ำ = double-scan) รับแค่ครั้งแรกต่อ session เท่านั้น
            if (hasDetectedRef.current) return
            hasDetectedRef.current = true
            // เสียง/feedback สแกนสำเร็จ (ถ้าเบราว์เซอร์รองรับ)
            try {
              navigator.vibrate?.(80)
            } catch {
              /* บางเบราว์เซอร์ไม่รองรับ vibrate ข้ามไปเงียบๆ */
            }
            onDetected(decodedText.trim())
          },
          () => {
            /* เฟรมที่หาไม่เจอ QR — เกิดตลอดเวลาเป็นปกติ ไม่ต้อง handle */
          }
        )
        .then(() => {
          if (cancelled) return
          // มือถือหลายรุ่นเลือกเลนส์ ultra-wide เป็นกล้องหลังตัวแรกโดยอัตโนมัติ ทำให้มุมมองกว้าง
          // เกินไปจนอาจสแกนโดน QR ของสินค้าชิ้นข้างเคียงบนโต๊ะเดียวกัน — ซูมเข้าเพื่อจำลองมุมมอง
          // แคบลงใกล้เคียงกล้องหลัก ถ้าอุปกรณ์/เบราว์เซอร์ไม่รองรับการปรับ zoom ก็ข้ามไปเงียบๆ
          // ไม่กระทบการสแกน (iOS Safari ส่วนใหญ่ไม่รองรับ แต่ Android Chrome ซึ่งเป็นอุปกรณ์หลัก
          // ของหน้าร้าน (Sunmi) รองรับ)
          try {
            const capabilities = html5QrCode.getRunningTrackCapabilities?.()
            if (capabilities?.zoom) {
              const { min = 1, max = 1 } = capabilities.zoom
              const zoom = Math.min(max, Math.max(min, TARGET_ZOOM))
              html5QrCode.applyVideoConstraints({ advanced: [{ zoom }] }).catch(() => {})
            }
          } catch {
            /* ไม่รองรับการปรับ zoom บนอุปกรณ์/เบราว์เซอร์นี้ ใช้กล้องแบบ default ต่อไปได้ปกติ */
          }
        })
        .catch((err) => {
          if (cancelled) return
          setCameraError('เปิดกล้องไม่ได้ (' + err + ') — ใช้ช่องกรอกรหัสมือแทนได้')
          setMode('manual')
        })
    })

    return () => {
      cancelled = true
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear().catch(() => {})
      }
    }
  }, [mode, disabled, onDetected])

  const manualSubmitLockRef = useRef(false) // กันกด/Enter ซ้ำเร็วๆตอนกรอกมือเช่นกัน
  const submitManual = () => {
    const code = manualCode.trim()
    if (!code || manualSubmitLockRef.current) return
    manualSubmitLockRef.current = true
    onDetected(code)
    setManualCode('')
    setTimeout(() => {
      manualSubmitLockRef.current = false
    }, 500)
  }

  return (
    <div className="qrscanner">
      <div className="qrscanner__tabs">
        <button
          className={`qrscanner__tab ${mode === 'camera' ? 'is-active' : ''}`}
          onClick={() => setMode('camera')}
          type="button"
        >
          📷 สแกน QR
        </button>
        <button
          className={`qrscanner__tab ${mode === 'manual' ? 'is-active' : ''}`}
          onClick={() => setMode('manual')}
          type="button"
        >
          ⌨️ กรอกรหัสเอง
        </button>
      </div>

      {mode === 'camera' ? (
        <div>
          <div id={REGION_ID} className="qrscanner__region" />
          {cameraError && <p className="qrscanner__error">{cameraError}</p>}
          {!cameraError && (
            <p className="qrscanner__hint">วางสินค้าให้ QR อยู่กึ่งกลางกรอบ ห่างจากสินค้าชิ้นอื่นเพื่อความแม่นยำ</p>
          )}
        </div>
      ) : (
        <div className="qrscanner__manual">
          <input
            className="qrscanner__input"
            placeholder="กรอกรหัสสินค้า"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            autoFocus
          />
          <Button onClick={submitManual} disabled={!manualCode.trim()}>
            ค้นหาสินค้า
          </Button>
        </div>
      )}
    </div>
  )
}
