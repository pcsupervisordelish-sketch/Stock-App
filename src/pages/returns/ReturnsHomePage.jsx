import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { RETURN_CATEGORIES } from '../../config/returnCategories'
import { fetchPendingSlips, fetchTodayConfirmedItems } from '../../services/returnsService'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'

export default function ReturnsHomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(null)
  const [urgentCount, setUrgentCount] = useState(0)
  const [todayCount, setTodayCount] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPendingSlips(session.branchCode), fetchTodayConfirmedItems(session.branchCode)])
      .then(([slips, todayItems]) => {
        if (cancelled) return
        setPendingCount(slips.length)
        setUrgentCount(slips.filter((s) => s.pending >= 2).length)
        setTodayCount(todayItems.length)
      })
      .catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [session.branchCode])

  const otherCategories = RETURN_CATEGORIES.filter((c) => !c.group)

  return (
    <div>
      <PageHeader title="บันทึก/ตีคืนสินค้า" subtitle="เลือกหมวดที่ต้องการบันทึกวันนี้" />

      {loadError && (
        <Card style={{ marginBottom: 16, borderColor: 'var(--color-danger)' }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดข้อมูลไม่สำเร็จ: {loadError}</p>
        </Card>
      )}

      {todayCount !== null && todayCount > 0 && (
        <Card style={{ marginBottom: 16, background: 'var(--color-primary-light)' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>
            วันนี้ยืนยันไปแล้ว {todayCount} รายการ — สแกนเพิ่มได้เลยถ้ามีของอีก
          </p>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <Card
          onClick={() => navigate('/returns/spoil')}
          style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 84 }}
        >
          <span style={{ fontSize: 28 }}>🔴</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>เสีย</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
              เสียคัดออก / เสียทำลายหน้าร้าน
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {otherCategories.map((c) => (
          <CategoryButton key={c.value} category={c} wide onClick={() => navigate(`/returns/scan/${encodeURIComponent(c.value)}`)} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card as={Link} to="/returns/pending" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'var(--color-text)' }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>📋 รายการที่ยังไม่ปิดรอบ</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pendingCount !== null && <span style={{ color: 'var(--color-text-muted)' }}>{pendingCount} วัน</span>}
            {urgentCount > 0 && <StatusBadge label={`ค้างนาน ${urgentCount}`} tone="danger" icon="🔴" />}
          </span>
        </Card>
        <Card as={Link} to="/returns/history" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'var(--color-text)' }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>🕘 ประวัติใบที่ส่งแล้ว</span>
          <span style={{ color: 'var(--color-text-muted)' }}>›</span>
        </Card>
      </div>
    </div>
  )
}

function CategoryButton({ category, onClick, wide }) {
  return (
    <Card
      onClick={onClick}
      style={{
        textAlign: wide ? 'left' : 'center',
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        alignItems: 'center',
        gap: wide ? 14 : 6,
        minHeight: 84,
        justifyContent: wide ? 'flex-start' : 'center'
      }}
    >
      <span style={{ fontSize: 28 }}>{category.icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 17 }}>{category.label}</div>
        {wide && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{category.description}</div>
        )}
      </div>
    </Card>
  )
}
