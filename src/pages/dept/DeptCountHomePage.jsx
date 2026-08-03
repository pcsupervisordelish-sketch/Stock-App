import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { hasSubmittedToday } from '../../services/deptCountService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

export default function DeptCountHomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [openingDone, setOpeningDone] = useState(null)
  const [closingDone, setClosingDone] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([hasSubmittedToday('opening', session.branchCode), hasSubmittedToday('closing', session.branchCode)])
      .then(([o, c]) => {
        if (!cancelled) {
          setOpeningDone(o)
          setClosingDone(c)
        }
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [session.branchCode])

  const loading = openingDone === null || closingDone === null

  return (
    <div>
      <PageHeader title="สแกน/นับสต๊อก" subtitle="เปิดร้าน - ปิดร้าน" />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>ตรวจสอบสถานะไม่สำเร็จ: {error}</p></Card>}
      {loading && !error && <p>กำลังตรวจสอบสถานะวันนี้...</p>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 19, fontWeight: 700 }}>🌅 นับเปิดร้าน</span>
              {openingDone && <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ เสร็จแล้ว</span>}
            </div>
            <Button onClick={() => navigate('/dept/count/scan/opening')} disabled={openingDone}>
              {openingDone ? 'นับเปิดร้านวันนี้เสร็จแล้ว' : 'เริ่มนับเปิดร้าน'}
            </Button>
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 19, fontWeight: 700 }}>🌙 นับปิดร้าน</span>
              {closingDone && <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ เสร็จแล้ว</span>}
            </div>
            {!openingDone && (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
                ต้องนับเปิดร้านให้เสร็จก่อน จึงจะนับปิดร้านได้
              </p>
            )}
            <Button onClick={() => navigate('/dept/count/scan/closing')} disabled={!openingDone || closingDone}>
              {closingDone ? 'นับปิดร้านวันนี้เสร็จแล้ว' : 'เริ่มนับปิดร้าน'}
            </Button>
          </Card>

          <Card as="button" onClick={() => navigate('/dept/stock')} style={{ textAlign: 'left', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer' }}>
            📦 ดูสต๊อกปัจจุบันโดยประมาณ ›
          </Card>
        </div>
      )}
    </div>
  )
}
