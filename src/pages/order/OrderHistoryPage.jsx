import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchOrderHistory } from '../../services/orderService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

const AREA_LABEL = { booth: '🏪 บูธ', fridge: '❄️ ตู้แช่' }

export default function OrderHistoryPage() {
  const { session } = useAuth()
  const [rounds, setRounds] = useState(null)
  const [error, setError] = useState(null)
  const [areaFilter, setAreaFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = () => {
    setError(null)
    setRefreshing(true)
    fetchOrderHistory(session.branchCode)
      .then(setRounds)
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false))
  }

  useEffect(load, [session.branchCode])

  const filtered = rounds?.filter((r) => areaFilter === 'all' || r.area === areaFilter)

  return (
    <div>
      <PageHeader
        title="ประวัติการสั่งย้อนหลัง"
        right={
          <Button variant="secondary" size="md" fullWidth={false} onClick={load} loading={refreshing} loadingText="">
            รีเฟรช
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {['all', 'booth', 'fridge'].map((a) => (
          <button
            key={a}
            onClick={() => setAreaFilter(a)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--color-border)',
              background: areaFilter === a ? 'var(--color-primary-light)' : 'white',
              borderColor: areaFilter === a ? 'var(--color-primary)' : 'var(--color-border)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {a === 'all' ? 'ทั้งหมด' : AREA_LABEL[a]}
          </button>
        ))}
      </div>

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {rounds === null && !error && <p>กำลังโหลด...</p>}
      {filtered?.length === 0 && <Card><p style={{ margin: 0 }}>ไม่มีประวัติการสั่ง</p></Card>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered?.map((round) => {
          const isOpen = expanded === round.key
          const totalQty = round.rows.reduce((sum, r) => sum + Number(r['จำนวนสั่ง'] || 0), 0)
          return (
            <Card key={round.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {AREA_LABEL[round.area]} • {round.orderDate} {round.orderTime}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    รับ/ส่ง {round.deliveryDate} • {round.rows.length} SKU ({totalQty} หน่วยรวม) • โดย {round.employee}
                  </div>
                </div>
                <Button variant="secondary" size="md" fullWidth={false} onClick={() => setExpanded(isOpen ? null : round.key)}>
                  {isOpen ? 'ซ่อน' : 'ดูรายละเอียด'}
                </Button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  {round.rows.map((r) => (
                    <div key={r.rowId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--color-border)' }}>
                      <span>{r['ชื่อไทย']} <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>({r['รหัส']})</span></span>
                      <strong>{r['จำนวนสั่ง']}</strong>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
