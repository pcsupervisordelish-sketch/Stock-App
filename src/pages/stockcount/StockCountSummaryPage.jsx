import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { stockCountDraftKey } from './StockCountScanPage'
import { submitCount } from '../../services/stockCountService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import QtyStepper from '../../components/ui/QtyStepper'
import DiscardDraftButton from '../../components/ui/DiscardDraftButton'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StickyActionBar from '../../components/layout/StickyActionBar'

export default function StockCountSummaryPage() {
  const { session } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()
  const navigate = useNavigate()

  const draftKey = stockCountDraftKey(session.branchCode)
  const { data: items, save, discardDraft, clearAfterSubmit } = useDraftAutosave(draftKey, [])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const removeItem = (index) => save(items.filter((_, i) => i !== index))
  const updateQty = (index, qty) => {
    const next = [...items]
    next[index] = { ...next[index], countedQty: qty }
    save(next)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const gps = await getCurrentPosition()
      const result = await submitCount(items, { session, gps })
      show(result.skipped ? 'รายการนี้เคยส่งไปแล้ว' : `ยืนยันสำเร็จ ${result.written} SKU`, { type: 'success' })
      clearAfterSubmit()
      navigate('/stock-count/report')
    } catch (err) {
      show(err.message || 'ยืนยันไม่สำเร็จ กรุณาลองใหม่', { type: 'error' })
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="สรุปก่อนยืนยัน" />
        <Card>
          <p style={{ margin: 0 }}>ยังไม่มีรายการที่นับ</p>
          <Button onClick={() => navigate('/stock-count/scan')} style={{ marginTop: 16 }}>
            กลับไปสแกนนับสต๊อก
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="สรุปก่อนยืนยัน"
        subtitle={`${items.length} SKU — แก้ไข/ลบได้ก่อนยืนยันส่งข้อมูล`}
        right={
          <DiscardDraftButton
            label="ยกเลิกการนับทั้งหมด"
            confirmMessage="รายการที่นับไว้ทั้งหมดในรอบนี้จะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ"
            onDiscard={() => {
              discardDraft()
              navigate('/stock-count')
            }}
          />
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 110 }}>
        {items.map((item, index) => {
          const diff = Number(item.countedQty) - Number(item.sapQtyFront || 0)
          return (
            <Card key={item.rowId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {item.name} {item.offBaseline && <span style={{ fontSize: 12, color: 'var(--color-warning)' }}>(ไม่พบใน SAP)</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.sku}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    SAP: {item.sapQtyFront || 0} {item.frontUnit} • Diff:{' '}
                    <strong style={{ color: diff === 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {diff > 0 ? `+${diff}` : diff}
                    </strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <QtyStepper value={item.countedQty} onChange={(qty) => updateQty(index, qty)} />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    aria-label="ลบรายการ"
                    style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 22, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <StickyActionBar>
        <Button onClick={() => setConfirmOpen(true)}>ยืนยันส่งข้อมูล ({items.length} SKU)</Button>
      </StickyActionBar>

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันส่งข้อมูลนับสต๊อก"
        message="หลังยืนยันแล้วจะปิดรอบนับวันนี้ แก้ไขต่อได้เฉพาะทีละ SKU ผ่านหน้าผลการนับเท่านั้น"
        confirmLabel="ยืนยันส่งข้อมูล"
        loading={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
