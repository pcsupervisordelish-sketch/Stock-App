import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchCurrentEstimatedStock } from '../../services/reconciliationService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

export default function DeptCurrentStockPage() {
  const { session } = useAuth()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = () => {
    setError(null)
    setRefreshing(true)
    fetchCurrentEstimatedStock(session.branchCode)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false))
  }

  useEffect(load, [session.branchCode])

  const filtered = rows?.filter(
    (r) => !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.includes(search)
  )

  return (
    <div>
      <PageHeader
        title="สต๊อกปัจจุบันโดยประมาณ"
        subtitle="คำนวณสด = เปิดร้าน + รับเข้าสะสม(จริง) − สินค้าออกทุกหมวดสะสม (ยังไม่หักยอดขายเพราะไม่มี POS)"
        right={
          <Button variant="secondary" size="md" fullWidth={false} onClick={load} loading={refreshing} loadingText="">
            รีเฟรช
          </Button>
        }
      />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {rows === null && !error && <p>กำลังโหลด...</p>}

      {rows !== null && (
        <>
          <input
            placeholder="ค้นหาชื่อ/รหัสสินค้า"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', minHeight: 48, fontSize: 17, padding: '0 14px', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((r) => (
              <Card key={r.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{r.sku}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 19 }}>
                  {r.estimatedCurrentStock} <span style={{ fontSize: 13, fontWeight: 400 }}>{r.unit}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
