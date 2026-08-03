import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import './QRScanner.css'

const REGION_ID = 'qr-scanner-region'

/**
 * QRScanner — สแกน QR ผ่านกล้องเว็บ (มือถือ/Sunmi ไม่มี hardware scanner แยก)
 * ทุกจุดที่ใช้คอมโพเนนต์นี้ต้องมีช่องกรอกรหัสมือสำรองเสมอ (บังคับตามสเปก)
 * onDetected(code: string) จะถูกเรียกทั้งจากการสแกนกล้องและจากการกรอกมือ
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
        .catch((err) => {
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
