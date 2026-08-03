import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { deptCountDraftKey, submitDeptCount } from '../../services/deptCountService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import QtyStepper from '../../components/ui/QtyStepper'
import DiscardDraftButton from '../../components/ui/DiscardDraftButton'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StickyActionBar from '../../components/layout/StickyActionBar'

const TITLE = { opening: 'สรุปนับเปิดร้าน', closing: 'สรุปนับปิดร้าน' }

export default function DeptCountSummaryPage() {
  const { type } = useParams()
  const { session } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()
  const navigate = useNavigate()

  const draftKey = deptCountDraftKey(type, session.branchCode)
  const { data: items, save, discardDraft, clearAfterSubmit } = useDraftAutosave(draftKey, [])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const removeItem = (index) => save(items.filter((_, i) => i !== index))
  const updateQty = (index, qty) => {
    const next = [...items]
    next[index] = { ...next[index], quantity: qty }
    save(next)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const gps = await getCurrentPosition()
      const result = await submitDeptCount(type, items, { session, gps })
      show(result.skipped ? 'รายการนี้เคยส่งไปแล้ว' : `ยืนยันสำเร็จ ${result.written} SKU`, { type: 'success' })
      clearAfterSubmit()
      navigate('/dept/count')
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
        <PageHeader title={TITLE[type] || 'สรุป'} />
        <Card>
          <p style={{ margin: 0 }}>ยังไม่มีรายการที่นับ</p>
          <Button onClick={() => navigate(`/dept/count/scan/${type}`)} style={{ marginTop: 16 }}>
            กลับไปสแกนนับ
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={TITLE[type] || 'สรุป'}
        subtitle={`${items.length} SKU — แก้ไข/ลบได้ก่อนยืนยัน`}
        right={
          <DiscardDraftButton
            label={`ยกเลิก${TITLE[type] || 'การนับ'}`}
            confirmMessage="รายการที่นับไว้ทั้งหมดในรอบนี้จะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ"
            onDiscard={() => {
              discardDraft()
              navigate('/dept/count')
            }}
          />
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 110 }}>
        {items.map((item, index) => (
          <Card key={item.rowId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.sku}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QtyStepper value={item.quantity} onChange={(qty) => updateQty(index, qty)} />
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label="ลบรายการ"
                style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 22, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </Card>
        ))}
      </div>

      <StickyActionBar>
        <Button onClick={() => setConfirmOpen(true)}>ยืนยันส่งข้อมูล ({items.length} SKU)</Button>
      </StickyActionBar>

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันส่งข้อมูล"
        message={
          type === 'opening'
            ? 'หลังยืนยันแล้วจะบล็อกไม่ให้นับเปิดร้านซ้ำอีกในวันนี้'
            : 'หลังยืนยันแล้วจะบล็อกไม่ให้นับปิดร้านซ้ำอีกในวันนี้ และปลดล็อกให้กด "สรุปส่งข้อมูล" ที่หน้าสรุปสิ้นวันได้'
        }
        confirmLabel="ยืนยันส่งข้อมูล"
        loading={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
