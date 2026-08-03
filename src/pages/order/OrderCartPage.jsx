import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { orderDraftKey, submitOrder } from '../../services/orderService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import QtyStepper from '../../components/ui/QtyStepper'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StickyActionBar from '../../components/layout/StickyActionBar'

const AREA_LABEL = { booth: 'บูธ', fridge: 'ตู้แช่' }

export default function OrderCartPage() {
  const { area } = useParams()
  const { session } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()
  const navigate = useNavigate()

  const draftKey = orderDraftKey(area, session.branchCode)
  const { data, save, clearAfterSubmit } = useDraftAutosave(draftKey, { deliveryDate: null, items: [] })

  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const updateQty = (index, qty) => {
    const next = [...data.items]
    next[index] = { ...next[index], quantity: qty }
    save({ ...data, items: next })
  }
  const removeItem = (index) => save({ ...data, items: data.items.filter((_, i) => i !== index) })

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const gps = await getCurrentPosition()
      const result = await submitOrder(area, data.items, data.deliveryDate, { session, gps })
      show(result.skipped ? 'คำสั่งซื้อนี้เคยส่งไปแล้ว' : `สั่งสินค้าสำเร็จ ${result.written} รายการ`, { type: 'success' })
      clearAfterSubmit()
      navigate('/dept/orders')
    } catch (err) {
      show(err.message || 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่', { type: 'error' })
    } finally {
      setSubmitting(false)
      setConfirmSubmit(false)
    }
  }

  const handleCancelCart = () => {
    clearAfterSubmit()
    setConfirmCancel(false)
    navigate('/dept/orders')
  }

  if (!data.items.length) {
    return (
      <div>
        <PageHeader title={`ตะกร้า — ${AREA_LABEL[area] || area}`} />
        <Card>
          <p style={{ margin: 0 }}>ตะกร้ายังไม่มีสินค้า</p>
          <Button onClick={() => navigate(`/dept/orders/${area}/select`)} style={{ marginTop: 16 }}>ไปเลือกสินค้า</Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`ตะกร้า — ${AREA_LABEL[area] || area}`} subtitle={`รับ/ส่งสินค้าวันที่ ${data.deliveryDate}`} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {data.items.map((item, index) => (
          <Card key={item.rowId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{item.nameThai}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.sku} {item.price ? `• ${item.price} บาท/${item.unit}` : ''}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QtyStepper value={item.quantity} onChange={(qty) => updateQty(index, qty)} />
              <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{item.unit}</span>
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

      <Button variant="secondary" onClick={() => navigate(`/dept/orders/${area}/select`)} style={{ marginBottom: 12 }}>
        + เพิ่มสินค้าอีก
      </Button>
      <Button variant="danger" onClick={() => setConfirmCancel(true)}>
        ยกเลิกตะกร้านี้ทั้งหมด
      </Button>

      <StickyActionBar>
        <Button onClick={() => setConfirmSubmit(true)}>ยืนยันส่งข้อมูล ({data.items.length} รายการ)</Button>
      </StickyActionBar>

      <ConfirmDialog
        open={confirmSubmit}
        title="ยืนยันส่งข้อมูลสั่งสินค้า"
        message="หลังยืนยันแล้วคำสั่งซื้อรอบนี้จะถูกล็อกทันที แก้ไขไม่ได้อีก ถ้าต้องการสั่งเพิ่มต้องเริ่มรอบใหม่แยกต่างหาก"
        confirmLabel="ยืนยันส่งข้อมูล"
        loading={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />

      <ConfirmDialog
        open={confirmCancel}
        title="ยกเลิกตะกร้านี้ทั้งหมด"
        message="รายการทั้งหมดในตะกร้าจะถูกลบทิ้ง ไม่ได้ส่งข้อมูลใดๆ เข้าระบบ"
        confirmLabel="ยกเลิกตะกร้า"
        danger
        onConfirm={handleCancelCart}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}
