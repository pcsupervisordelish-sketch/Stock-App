import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchTodayBaseline, fetchDiffReport, fetchMissingSkuAlert } from '../../services/stockCountService'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'

export default function StockCountMissingSkuPage() {
  const { session } = useAuth()
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [baseline, counted] = await Promise.all([
          fetchTodayBaseline(session.branchCode),
          fetchDiffReport(session.branchCode)
        ])
        const countedSkuSet = new Set(counted.map((r) => r['รหัสสินค้า']))
        const alert = await fetchMissingSkuAlert(session.branchCode, baseline, countedSkuSet)
        if (!cancelled) setResult(alert)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.branchCode])

  return (
    <div>
      <PageHeader title="SKU ที่ไม่ถูกนับวันนี้" subtitle="แบ่งอัตโนมัติจากประวัตินับย้อนหลัง 45 วัน" />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {!result && !error && <p>กำลังวิเคราะห์...</p>}

      {result && (
        <>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>
            🔴 ต้องดู ({result.needsReview.length}) — เคยนับสม่ำเสมอ แต่วันนี้ยังไม่ถูกนับ
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {result.needsReview.length === 0 && <Card><p style={{ margin: 0, color: 'var(--color-text-muted)' }}>ไม่มี — นับครบทุก SKU ที่ขายเป็นประจำแล้ว</p></Card>}
            {result.needsReview.map((item) => (
              <Card key={item.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.sku}</div>
                </div>
                <StatusBadge label={`นับ ${item.activeDays} วัน/45วัน`} tone="danger" icon="🔴" />
              </Card>
            ))}
          </div>

          <details>
            <summary style={{ fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
              🔇 เงียบยาว ({result.longQuiet.length}) — ไม่เคยขายนาน (พับซ่อนไว้)
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.longQuiet.map((item) => (
                <Card key={item.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.sku}</div>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>นับ {item.activeDays} วัน/45วัน</span>
                </Card>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  )
}
