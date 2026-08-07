import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fetchPendingSlips, shipSlipDate } from '../../services/returnsService'
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
      <LoadingOverlay show={shipping} label="กำลังบันทึก..." />
    </div>
  )
}
