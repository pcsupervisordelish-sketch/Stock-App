import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { RETURN_CATEGORIES } from '../../config/returnCategories'
import { fetchPendingSlips, fetchTodayConfirmedItems } from '../../services/returnsService'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'

// ลำดับความสำคัญตามที่ตกลง: รายการค้าง > ประวัติ > เสีย (คัดออก/ทำลาย) > แถม/เคลม/อื่นๆ
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

  const spoilCategories = RETURN_CATEGORIES.filter((c) => c.group === 'เสีย')
  const otherCategories = RETURN_CATEGORIES.filter((c) => !c.group)

  return (
    <div>
      <PageHeader title="บันทึก/ตีคืนสินค้า" subtitle="เลือกรายการที่ต้องการทำ" />

      {loadError && (
        <Card style={{ marginBottom: 16, borderColor: 'var(--color-danger)' }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดข้อมูลไม่สำเร็จ: {loadError}</p>
        </Card>
      )}

      {/* 1. รายการที่ยังไม่ปิดรอบ — สำคัญสุด ต้องเห็นก่อนเสมอ */}
      <Card
        as={Link}
        to="/returns/pending"
        className="card-interactive"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textDecoration: 'none',
          color: 'var(--color-text)',
          marginBottom: 12,
          border: urgentCount > 0 ? '2px solid var(--color-danger)' : undefined
        }}
      >
        <span style={{ fontSize: 19, fontWeight: 700 }}>📋 รายการที่ยังไม่ปิดรอบ</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pendingCount !== null && <span style={{ color: 'var(--color-text-muted)' }}>{pendingCount} วัน</span>}
          {urgentCount > 0 && <StatusBadge label={`ค้างนาน ${urgentCount}`} tone="danger" icon="🔴" />}
        </span>
      </Card>

      {/* 2. ประวัติใบที่ส่งแล้ว */}
      <Card
        as={Link}
        to="/returns/history"
        className="card-interactive"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'var(--color-text)', marginBottom: 24 }}
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>🕘 ประวัติใบที่ส่งแล้ว</span>
        <span style={{ color: 'var(--color-text-muted)' }}>›</span>
      </Card>

      {todayCount !== null && todayCount > 0 && (
        <Card style={{ marginBottom: 16, background: 'var(--color-primary-light)' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>
            วันนี้ยืนยันไปแล้ว {todayCount} รายการ — สแกนเพิ่มได้เลยถ้ามีของอีก
          </p>
        </Card>
      )}

      {/* 3. เสีย — คัดออก/ทำลายหน้าร้าน อยู่ในกลุ่มเดียวกัน สีแยกชัดกันกรอกผิด */}
      <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 20 }}>🔴 เสีย</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {spoilCategories.map((c) => (
          <CategoryButton key={c.value} category={c} onClick={() => navigate(`/returns/scan/${encodeURIComponent(c.value)}`)} />
        ))}
      </div>

      {/* 4. แถม / เคลม / อื่นๆ — ลำดับถัดไป เล็กกว่า เสีย ให้เห็นชัดว่าสำคัญน้อยกว่า */}
      <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 16, color: 'var(--color-text-muted)' }}>อื่นๆ</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {otherCategories.map((c) => (
          <CategoryButton key={c.value} category={c} wide compact onClick={() => navigate(`/returns/scan/${encodeURIComponent(c.value)}`)} />
        ))}
      </div>
    </div>
  )
}

function CategoryButton({ category, onClick, wide, compact }) {
  const toneVar = `var(--color-${category.tone})`
  return (
    <Card
      onClick={onClick}
      className="card-interactive"
      style={{
        textAlign: wide ? 'left' : 'center',
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        alignItems: 'center',
        gap: wide ? 14 : 6,
        minHeight: compact ? 60 : 84,
        padding: compact ? 14 : 18,
        justifyContent: wide ? 'flex-start' : 'center',
        borderLeft: `4px solid ${toneVar}` // แถบสีข้างซ้ายบอกหมวดชัดเจน กันกรอกผิด
      }}
    >
      <span style={{ fontSize: compact ? 22 : 28 }}>{category.icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: compact ? 16 : 17, color: toneVar }}>{category.label}</div>
        {wide && !compact && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{category.description}</div>
        )}
      </div>
    </Card>
  )
}
