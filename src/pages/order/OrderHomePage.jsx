import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { readOrderDraft } from '../../services/orderService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

const AREAS = [
  { key: 'booth', icon: '🏪', label: 'บูธ' },
  { key: 'fridge', icon: '❄️', label: 'ตู้แช่' }
]

export default function OrderHomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const drafts = {
    booth: readOrderDraft('booth', session.branchCode),
    fridge: readOrderDraft('fridge', session.branchCode)
  }
  const busyArea = drafts.booth ? 'booth' : drafts.fridge ? 'fridge' : null

  const handlePickArea = (area) => {
    if (busyArea && busyArea !== area) return // ปุ่มถูก disable อยู่แล้ว แต่กันไว้อีกชั้น
    if (drafts[area]) {
      navigate(`/dept/orders/${area}/cart`)
    } else {
      navigate(`/dept/orders/${area}/date`)
    }
  }

  return (
    <div>
      <PageHeader title="สั่งสินค้า" subtitle="เลือกพื้นที่ก่อนเริ่ม — สั่งได้ทีละพื้นที่เท่านั้น" />

      {busyArea && (
        <Card style={{ marginBottom: 20, background: 'var(--color-warning-bg)' }}>
          <p style={{ margin: 0, color: '#7A5B00' }}>
            มีตะกร้าค้างของพื้นที่ "{AREAS.find((a) => a.key === busyArea).label}" ที่ยังไม่ยืนยันส่งข้อมูล
            ต้องทำรายการนี้ให้เสร็จ (ยืนยันส่งข้อมูล หรือยกเลิกตะกร้าทิ้ง) ก่อนเริ่มพื้นที่อื่นได้
          </p>
          <Button onClick={() => navigate(`/dept/orders/${busyArea}/cart`)} style={{ marginTop: 12 }}>
            ไปที่ตะกร้าที่ค้างอยู่
          </Button>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {AREAS.map((a) => {
          const disabled = busyArea && busyArea !== a.key
          return (
            <Card
              key={a.key}
              onClick={disabled ? undefined : () => handlePickArea(a.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            >
              <span style={{ fontSize: 32 }}>{a.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 19 }}>{a.label}</span>
              {drafts[a.key] && (
                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-warning)', fontWeight: 700 }}>
                  มีตะกร้าค้าง
                </span>
              )}
            </Card>
          )
        })}
      </div>

      <Card as={Link} to="/dept/orders/history" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 700 }}>
        🕘 ประวัติการสั่งย้อนหลัง ›
      </Card>
    </div>
  )
}
