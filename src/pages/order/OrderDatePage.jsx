import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { orderDraftKey, readOrderDraft } from '../../services/orderService'
import { todayKey } from '../../utils/dateUtils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

const AREA_LABEL = { booth: 'บูธ', fridge: 'ตู้แช่' }
const OTHER_AREA = { booth: 'fridge', fridge: 'booth' }

function tomorrowKey() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return todayKey(d)
}

export default function OrderDatePage() {
  const { area } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  // กันเข้าผ่าน URL ตรงข้าม E0 — ถ้าอีกพื้นที่มีตะกร้าค้างอยู่ ห้ามเริ่มพื้นที่นี้
  useEffect(() => {
    const otherArea = OTHER_AREA[area]
    if (otherArea && readOrderDraft(otherArea, session.branchCode)) {
      navigate('/dept/orders', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area])

  const draftKey = orderDraftKey(area, session.branchCode)
  const { data, save } = useDraftAutosave(draftKey, { deliveryDate: null, items: [] })

  const [deliveryDate, setDeliveryDate] = useState(data.deliveryDate || tomorrowKey())

  const handleContinue = () => {
    save({ ...data, deliveryDate })
    navigate(`/dept/orders/${area}/select`)
  }

  return (
    <div>
      <PageHeader title={`สั่งสินค้า — ${AREA_LABEL[area] || area}`} subtitle="กรอกวันที่คาดว่าจะรับ/ส่งสินค้าก่อนเริ่ม" />
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, fontSize: 18 }}>วันที่รับ/ส่งสินค้า</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            style={{ width: '100%', minHeight: 56, fontSize: 20, padding: '0 14px', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)' }}
          />
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8 }}>แก้ไขเป็นวันอื่นได้ตลอด ไม่จำเป็นต้องเป็นวันถัดไป</p>
        </div>
        <Button onClick={handleContinue} disabled={!deliveryDate}>
          ถัดไป — เลือกสินค้า
        </Button>
      </Card>
    </div>
  )
}
