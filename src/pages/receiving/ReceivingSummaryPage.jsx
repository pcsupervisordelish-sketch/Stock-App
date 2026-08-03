import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { receivingDraftKey } from './ReceivingScanPage'
import { submitReceivingBatch } from '../../services/receivingService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import QtyStepper from '../../components/ui/QtyStepper'
import DiscardDraftButton from '../../components/ui/DiscardDraftButton'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StickyActionBar from '../../components/layout/StickyActionBar'

export default function ReceivingSummaryPage() {
  const { session } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()
  const navigate = useNavigate()

  const draftKey = receivingDraftKey(session.branchCode)
  const { data: items, save, discardDraft, clearAfterSubmit } = useDraftAutosave(draftKey, [])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const updateField = (index, field, value) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: value }
    save(next)
  }
  const removeItem = (index) => save(items.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const gps = await getCurrentPosition()
      const result = await submitReceivingBatch(items, { session, gps })
      show(result.skipped ? 'รายการนี้เคยส่งไปแล้ว' : `สรุปผลสำเร็จ ${result.written} SKU`, { type: 'success' })
      clearAfterSubmit()
      navigate('/receiving')
    } catch (err) {
      show(err.message || 'ส่งข้อมูลไม่สำเร็จ', { type: 'error' })
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="สรุปผลรับเข้า" />
        <Card>
          <p style={{ margin: 0 }}>ยังไม่มีรายการรับเข้า</p>
          <Button onClick={() => navigate('/receiving')} style={{ marginTop: 16 }}>กลับไปสแกน</Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="สรุปผลรับเข้า"
        subtitle={`${items.length} SKU — แก้ไขได้ก่อนส่งข้อมูล`}
        right={
          <DiscardDraftButton
            label="ยกเลิกทั้งหมด"
            confirmMessage="รายการรับเข้าที่บันทึกไว้ทั้งหมดในรอบนี้จะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ"
            onDiscard={() => {
              discardDraft()
              navigate('/receiving')
            }}
          />
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 110 }}>
        {items.map((item, index) => {
          const diff = Number(item.receivedQty) - Number(item.noteQty)
          return (
            <Card key={item.rowId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.sku} • {item.unit}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label="ลบรายการ"
                  style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 22, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>จำนวนตามใบส่งของ</div>
                  <QtyStepper value={item.noteQty} onChange={(qty) => updateField(index, 'noteQty', qty)} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>จำนวนจริงที่รับ</div>
                  <QtyStepper value={item.receivedQty} onChange={(qty) => updateField(index, 'receivedQty', qty)} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>ผลต่าง</div>
                  <div style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, fontWeight: 800, color: diff === 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {diff > 0 ? `+${diff}` : diff}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <StickyActionBar>
        <Button onClick={() => setConfirmOpen(true)}>สรุปผลและส่งข้อมูล ({items.length} SKU)</Button>
      </StickyActionBar>

      <ConfirmDialog
        open={confirmOpen}
        title="สรุปผลและส่งข้อมูล"
        message="หลังยืนยันแล้วจะล็อกรอบรับเข้านี้ทันที แก้ไขต่อไม่ได้อีก"
        confirmLabel="ยืนยันส่งข้อมูล"
        loading={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
