import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchCountHistorySummary } from '../../services/stockCountService'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'

export default function StockCountHistoryPage() {
  const { session } = useAuth()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCountHistorySummary(session.branchCode).then(setSummary).catch((err) => setError(err.message))
  }, [session.branchCode])

  return (
    <div>
      <PageHeader title="ประวัติการนับย้อนหลัง" subtitle="แนวโน้มความคลาดเคลื่อน 60 วันล่าสุด" />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {summary === null && !error && <p>กำลังโหลด...</p>}
      {summary !== null && summary.length === 0 && <Card><p style={{ margin: 0 }}>ยังไม่มีประวัติการนับ</p></Card>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {summary?.map((day) => (
          <Card key={day.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{day.date}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{day.skuCount} SKU • diff รวม {day.totalAbsDiff}</div>
            </div>
            {day.abnormalCount > 0 ? (
              <StatusBadge label={`ผิดปกติ ${day.abnormalCount}`} tone="danger" icon="🔴" />
            ) : (
              <StatusBadge label="ปกติ" tone="success" icon="🟢" />
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
