import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchTodayBaseline, hasTodaySubmittedCount } from '../../services/stockCountService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

export default function StockCountHomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // loading | needImport | readyToScan | submitted | error
  const [error, setError] = useState(null)
  const [baselineCount, setBaselineCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const baseline = await fetchTodayBaseline(session.branchCode)
        if (cancelled) return
        setBaselineCount(baseline.length)
        if (baseline.length === 0) {
          setState('needImport')
          return
        }
        const submitted = await hasTodaySubmittedCount(session.branchCode)
        if (cancelled) return
        setState(submitted ? 'submitted' : 'readyToScan')
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setState('error')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.branchCode])

  return (
    <div>
      <PageHeader title="นับสต๊อก (เทียบ SAP)" />

      {state === 'loading' && <p>กำลังตรวจสอบสถานะวันนี้...</p>}

      {state === 'error' && (
        <Card>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>ตรวจสอบสถานะไม่สำเร็จ: {error}</p>
        </Card>
      )}

      {state === 'needImport' && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 18 }}>
            ยังไม่ได้ import ข้อมูลสต๊อกจาก SAP ของวันนี้ — ต้อง import ก่อนจึงจะเริ่มนับได้
          </p>
          <Button onClick={() => navigate('/stock-count/import')}>📥 Import ข้อมูล SAP</Button>
        </Card>
      )}

      {state === 'readyToScan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ background: 'var(--color-primary-light)' }}>
            <p style={{ margin: 0 }}>Baseline วันนี้พร้อมแล้ว ({baselineCount} SKU) — เริ่มสแกนนับสต๊อกได้เลย</p>
          </Card>
          <Card as={Link} to="/stock-count/scan" style={navCardStyle}>
            🔄 เริ่ม/ทำต่อการสแกนนับสต๊อก
          </Card>
          <Card as={Link} to="/stock-count/history" style={navCardStyle}>
            🕘 ประวัติย้อนหลัง
          </Card>
        </div>
      )}

      {state === 'submitted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ background: 'var(--color-success-bg)' }}>
            <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 700 }}>
              วันนี้ยืนยันส่งข้อมูลนับสต๊อกไปแล้ว
            </p>
          </Card>
          <Card as={Link} to="/stock-count/report" style={navCardStyle}>
            📊 ดูผลการนับ (Diff Report)
          </Card>
          <Card as={Link} to="/stock-count/history" style={navCardStyle}>
            🕘 ประวัติย้อนหลัง
          </Card>
        </div>
      )}
    </div>
  )
}

const navCardStyle = {
  display: 'block',
  textDecoration: 'none',
  color: 'var(--color-text)',
  fontWeight: 700,
  fontSize: 18
}
