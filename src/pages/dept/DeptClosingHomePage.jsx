import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchRecentClosingStatuses } from '../../services/reconciliationService'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'

export default function DeptClosingHomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [statuses, setStatuses] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchRecentClosingStatuses(session.branchCode).then(setStatuses).catch((err) => setError(err.message))
  }, [session.branchCode])

  return (
    <div>
      <PageHeader title="สรุปสิ้นวัน" subtitle="เลือกวันที่เพื่อดู/ยืนยันสรุปกระทบยอด" />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {statuses === null && !error && <p>กำลังโหลด...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {statuses?.map((s) => (
          <Card key={s.date} onClick={() => navigate(`/dept/closing/${s.date}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{s.date}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {s.openingDone ? '✓ เปิดร้านแล้ว' : '— ยังไม่เปิดร้าน'} • {s.closingDone ? '✓ ปิดร้านแล้ว' : '— ยังไม่ปิดร้าน'}
                </div>
              </div>
              {s.locked ? (
                <StatusBadge label="สรุปส่งข้อมูลแล้ว" tone="success" icon="🟢" />
              ) : (
                <StatusBadge label="ยังทำกิจกรรมไม่ครบ" tone="warning" icon="🟡" />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
