import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import {
  fetchDailyClosingStatus,
  computeReconciliation,
  fetchAnomalyFlags,
  lockDailyClosing
} from '../../services/reconciliationService'
import { readSheet } from '../../services/sheetsService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StatusBadge from '../../components/ui/StatusBadge'

export default function DeptClosingDetailPage() {
  const { date } = useParams()
  const { session } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()
  const navigate = useNavigate()

  const [status, setStatus] = useState(null)
  const [rows, setRows] = useState(null)
  const [anomalies, setAnomalies] = useState(new Map())
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [locking, setLocking] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await fetchDailyClosingStatus(session.branchCode, date)
        if (cancelled) return
        setStatus(s)

        if (s.locked) {
          const reconRows = await readSheet('Reconciliation', { สาขา: session.branchCode, วันที่: date })
          if (!cancelled) setRows(mapReconRows(reconRows))
        } else if (s.closingDone) {
          const computed = await computeReconciliation(session.branchCode, date)
          if (cancelled) return
          setRows(computed)
          const flags = await fetchAnomalyFlags(session.branchCode, computed)
          if (!cancelled) setAnomalies(flags)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.branchCode, date])

  const handleLock = async () => {
    setLocking(true)
    try {
      const gps = await getCurrentPosition()
      const result = await lockDailyClosing(session.branchCode, date, rows, { employeeName: session.employeeName, gps })
      if (result.skipped) {
        show('วันนี้มีคนสรุปส่งข้อมูลไปก่อนแล้ว (อาจเป็นอีกเครื่อง) — กำลังโหลดข้อมูลล่าสุด', { type: 'info' })
      } else {
        show('สรุปส่งข้อมูลสำเร็จ — ล็อกยอดของวันนี้แล้ว', { type: 'success' })
      }
      navigate('/dept/closing')
    } catch (err) {
      show(err.message || 'สรุปส่งข้อมูลไม่สำเร็จ', { type: 'error' })
    } finally {
      setLocking(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div>
      <PageHeader title={`สรุปสิ้นวัน ${date}`} />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {!status && !error && <p>กำลังโหลด...</p>}

      {status && !status.closingDone && !status.locked && (
        <Card>
          <p style={{ margin: 0 }}>
            ยังทำ "นับปิดร้าน" ของวันนี้ไม่เสร็จ — ต้องนับปิดร้านให้เสร็จก่อนจึงจะสรุปยอดวันนี้ได้
          </p>
          <Button onClick={() => navigate('/dept/count')} style={{ marginTop: 16 }}>
            ไปหน้านับสต๊อก
          </Button>
        </Card>
      )}

      {status?.locked && (
        <Card style={{ marginBottom: 16, background: 'var(--color-success-bg)' }}>
          <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 700 }}>
            🟢 สรุปส่งข้อมูลแล้ว — ล็อกถาวร ดูรายละเอียดได้อย่างเดียว
          </p>
        </Card>
      )}

      {rows && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {rows.map((r) => (
              <Card key={r.sku}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{r.sku}</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: 'var(--color-text-muted)' }}>
                      เปิดร้าน {r.opening} + รับเข้า {r.received} − เสียคัดออก {r['เสียคัดออก']} − เสียทำลาย {r['เสียทำลายหน้าร้าน']}
                      {' '}− แถม {r['แถม']} − เคลม {r['เคลม']} − อื่นๆ {r['อื่นๆ']} = ควรจะเหลือ {r.shouldRemain}
                    </div>
                    <div style={{ fontSize: 14, marginTop: 4 }}>ปิดร้านจริง: {r.closing} {r.unit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>ยอดขายได้โดยประมาณ</div>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>{r.estimatedSales}</div>
                    <StatusBadge {...reconciliationStatusProps(r.status)} />
                    {anomalies.has(r.sku) && (
                      <div style={{ marginTop: 6 }}>
                        <StatusBadge
                          label={`ผิดปกติ (ค่าเฉลี่ย ${anomalies.get(r.sku).avg})`}
                          tone="danger"
                          icon="⚠️"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {!status.locked && (
            <Button onClick={() => setConfirmOpen(true)}>ยืนยันสรุปส่งข้อมูล</Button>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันสรุปส่งข้อมูล"
        message="ตัวเลขกระทบยอดของวันนี้จะถูกล็อกถาวร แก้ไขไม่ได้อีก (ยอดขายได้โดยประมาณเท่านั้น ไม่ใช่ยอดขายจริง 100%)"
        confirmLabel="ยืนยันสรุปส่งข้อมูล"
        loading={locking}
        onConfirm={handleLock}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

function mapReconRows(reconRows) {
  return reconRows.map((r) => ({
    sku: r['รหัสสินค้า'],
    name: r['ชื่อสินค้า'],
    unit: '',
    opening: r['นับเปิดร้าน'],
    received: r['รับเข้า'],
    เสียคัดออก: r['เสียคัดออก'],
    เสียทำลายหน้าร้าน: r['เสียทำลายหน้าร้าน'],
    แถม: r['แถม'],
    เคลม: r['เคลม'],
    อื่นๆ: r['อื่นๆ'],
    shouldRemain: r['ควรจะเหลือ'],
    closing: r['นับปิดร้านจริง'],
    estimatedSales: r['ขายได้ (ที่คำนวนได้ตามจริง)'],
    diff: r['หายจากการบันทึก (Diff)'],
    status: r['สถานะ']
  }))
}

function reconciliationStatusProps(status) {
  if (status === 'ถูกต้อง') return { label: 'ถูกต้อง', tone: 'success', icon: '🟢' }
  if (status === 'ของเกิน') return { label: 'ของเกิน', tone: 'warning', icon: '🟡' }
  if (status === 'ของหาย') return { label: 'ของหาย', tone: 'info', icon: '🔵' }
  return { label: status, tone: 'neutral' }
}
