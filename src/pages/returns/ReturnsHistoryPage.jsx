import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchShippedHistory } from '../../services/returnsService'
import { getCategory } from '../../config/returnCategories'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

export default function ReturnsHistoryPage() {
  const { session } = useAuth()
  const [slips, setSlips] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchShippedHistory(session.branchCode).then(setSlips).catch((err) => setError(err.message))
  }, [session.branchCode])

  return (
    <div>
      <PageHeader title="ประวัติใบตีคืน" subtitle="ใบที่ยืนยันส่งแล้ว (Shipped) — ดูอย่างเดียว" />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {slips === null && !error && <p>กำลังโหลด...</p>}
      {slips !== null && slips.length === 0 && <Card><p style={{ margin: 0 }}>ยังไม่มีประวัติ</p></Card>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slips?.map((slip) => {
          const isOpen = expanded === slip.date
          const totalQty = slip.rows.reduce((sum, r) => sum + Number(r['จำนวน'] || 0), 0)
          return (
            <Card key={slip.date}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>ใบวันที่ {slip.date}</div>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                    {slip.rows.length} รายการ • รวม {totalQty} หน่วย
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth={false}
                  onClick={() => setExpanded(isOpen ? null : slip.date)}
                >
                  {isOpen ? 'ซ่อน' : 'ดูรายละเอียด'}
                </Button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  {slip.rows.map((r) => (
                    <div key={r.rowId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--color-border)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r['ชื่อสินค้า']}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                          {getCategory(r['หมวด'])?.icon} {r['หมวด']}
                          {r['หมายเหตุ'] ? ` • ${r['หมายเหตุ']}` : ''}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {r['จำนวน']} {r['หน่วย']}
                      </div>
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
