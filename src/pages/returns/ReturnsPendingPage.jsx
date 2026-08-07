import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fetchPendingSlips, shipSlipDate, cancelSlipDate } from '../../services/returnsService'
import { verifyBranchLogin } from '../../services/sheetsService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import StatusBadge from '../../components/ui/StatusBadge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import PageHeader from '../../components/layout/PageHeader'
import StickyActionBar from '../../components/layout/StickyActionBar'
import LoadingOverlay from '../../components/ui/LoadingOverlay'

function pendingTone(days) {
  if (days >= 3) return { tone: 'danger', icon: '🔴' }
  if (days === 2) return { tone: 'warning', icon: '🟠' }
  return { tone: 'success', icon: '🟢' }
}

export default function ReturnsPendingPage() {
  const { session } = useAuth()
  const { show } = useToast()
  const [slips, setSlips] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [shipping, setShipping] = useState(false)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // ยกเลิกทั้งใบ — ต้องยืนยันรหัสผ่านสาขาก่อนเสมอ (ข้อมูลนี้ยืนยันส่งแล้ว ลบออกจาก Sheet ถาวร)
  const [cancelTarget, setCancelTarget] = useState(null) // date ที่กำลังจะยกเลิก
  const [cancelPassword, setCancelPassword] = useState('')
  const [cancelPasswordError, setCancelPasswordError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = () => {
    setError(null)
    setRefreshing(true)
    fetchPendingSlips(session.branchCode)
      .then(setSlips)
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false))
  }

  useEffect(load, [session.branchCode])

  const toggle = (date) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const handleShipSelected = async () => {
    setShipping(true)
    try {
      for (const date of selected) {
        // eslint-disable-next-line no-await-in-loop
        await shipSlipDate(session.branchCode, date, { editedBy: session.employeeName })
      }
      show(`ยืนยันส่งแล้ว ${selected.size} วัน`, { type: 'success' })
      setSelected(new Set())
      setConfirmOpen(false)
      load()
    } catch (err) {
      show(err.message || 'ยืนยันส่งไม่สำเร็จ', { type: 'error' })
    } finally {
      setShipping(false)
    }
  }

  const openCancelDialog = (date) => {
    setCancelTarget(date)
    setCancelPassword('')
    setCancelPasswordError('')
  }

  const handleCancelSlip = async () => {
    if (!cancelPassword.trim()) {
      setCancelPasswordError('กรุณากรอกรหัสผ่านสาขา')
      return
    }
    setCancelling(true)
    setCancelPasswordError('')
    try {
      // ยืนยันรหัสผ่านสาขาก่อนทุกครั้ง — ใช้ตัวเดียวกับตอน Login ไม่ต้องสร้างระบบ PIN ใหม่
      const result = await verifyBranchLogin(session.branchCode, cancelPassword)
      if (!result.valid) {
        setCancelPasswordError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่')
        return
      }
      await cancelSlipDate(session.branchCode, cancelTarget, { editedBy: session.employeeName })
      show(`ยกเลิกใบวันที่ ${cancelTarget} แล้ว`, { type: 'success' })
      setCancelTarget(null)
      load()
    } catch (err) {
      show(err.message || 'ยกเลิกไม่สำเร็จ กรุณาลองใหม่', { type: 'error' })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div>
      <PageHeader title="รายการที่ยังไม่ปิดรอบ" subtitle="ติ๊กเลือกวันที่ขนส่งรับของแล้ว (เลือกได้หลายวัน)" />

      {error && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดข้อมูลไม่สำเร็จ: {error}</p>
          <Button variant="secondary" onClick={load} loading={refreshing} loadingText="" style={{ marginTop: 12 }}>ลองใหม่</Button>
        </Card>
      )}

      {slips === null && !error && <p>กำลังโหลด...</p>}
      {slips !== null && slips.length === 0 && <Card><p style={{ margin: 0 }}>ไม่มีรายการค้าง — ปิดรอบครบแล้ว</p></Card>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 110 }}>
        {slips?.map((slip) => {
          const { tone, icon } = pendingTone(slip.pending)
          const summaryText = Object.entries(slip.categorySummary)
            .map(([cat, qty]) => `${cat} ${qty}`)
            .join(', ')
          return (
            <Card key={slip.date} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <input
                type="checkbox"
                checked={selected.has(slip.date)}
                onChange={() => toggle(slip.date)}
                style={{ width: 26, height: 26, marginTop: 4 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>ใบวันที่ {slip.date}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: '4px 0' }}>{summaryText}</div>
                <StatusBadge label={`ค้างมา ${slip.pending} วัน`} tone={tone} icon={icon} />
              </div>
              <button
                type="button"
                onClick={() => openCancelDialog(slip.date)}
                style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                ยกเลิกใบนี้
              </button>
            </Card>
          )
        })}
      </div>

      {selected.size > 0 && (
        <StickyActionBar>
          <Button onClick={() => setConfirmOpen(true)}>ยืนยันส่งแล้ว (เฉพาะที่เลือก {selected.size})</Button>
        </StickyActionBar>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันส่งแล้ว"
        message={`ยืนยันว่าขนส่งรับของไปแล้วสำหรับ ${selected.size} วันที่เลือก — หลังยืนยันจะแก้ไขไม่ได้อีก`}
        confirmLabel="ยืนยันส่งแล้ว"
        onConfirm={handleShipSelected}
        onCancel={() => setConfirmOpen(false)}
        loading={shipping}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        title="ยกเลิกใบตีคืนทั้งใบ"
        danger
        message={
          <div>
            <p style={{ margin: '0 0 12px 0' }}>
              ยืนยันยกเลิกใบวันที่ <strong>{cancelTarget}</strong> ทั้งใบ — รายการทั้งหมดในวันนี้จะถูกลบออกจากระบบถาวร
              กู้คืนไม่ได้ กรุณากรอกรหัสผ่านสาขาเพื่อยืนยันตัวตนก่อนดำเนินการ
            </p>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>รหัสผ่านสาขา</label>
            <input
              type="password"
              value={cancelPassword}
              onChange={(e) => {
                setCancelPassword(e.target.value)
                setCancelPasswordError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCancelSlip()}
              autoFocus
              style={{ width: '100%', fontSize: 18, padding: '10px 14px', borderRadius: 8, border: '2px solid var(--color-border)' }}
            />
            {cancelPasswordError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 8, marginBottom: 0 }}>{cancelPasswordError}</p>
            )}
          </div>
        }
        confirmLabel="ยืนยันยกเลิกใบนี้"
        onConfirm={handleCancelSlip}
        onCancel={() => setCancelTarget(null)}
        loading={cancelling}
      />

      <LoadingOverlay show={shipping} label="กำลังบันทึก..." />
    </div>
  )
}
