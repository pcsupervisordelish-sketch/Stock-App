import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMenuForBranchType } from '../config/menuConfig'
import { fetchPendingSlips } from '../services/returnsService'
import Card from '../components/ui/Card'
import PageHeader from '../components/layout/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'

export default function HomePage() {
  const { session } = useAuth()
  const items = getMenuForBranchType(session.branchType)
  const [urgentReturnsCount, setUrgentReturnsCount] = useState(0)

  // badge ตัวเลขแจ้งเตือนที่เมนู "บันทึก/ตีคืนสินค้า" ถ้ามีใบค้างนานผิดปกติ (ตามสเปก C3)
  useEffect(() => {
    let cancelled = false
    fetchPendingSlips(session.branchCode)
      .then((slips) => {
        if (!cancelled) setUrgentReturnsCount(slips.filter((s) => s.pending >= 2).length)
      })
      .catch(() => {
        /* โหลด badge ไม่สำเร็จ ไม่ต้องรบกวนหน้าหลัก แค่ไม่แสดง badge */
      })
    return () => {
      cancelled = true
    }
  }, [session.branchCode])

  return (
    <div>
      <PageHeader
        title={`สวัสดี คุณ${session.employeeName}`}
        subtitle={`สาขา: ${session.branchName} • ประเภท: ${session.branchType}`}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item) => (
          <Card
            key={item.path}
            as={Link}
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              color: 'var(--color-text)'
            }}
            to={item.path}
          >
            <span style={{ fontSize: 32 }}>{item.icon}</span>
            <span style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>{item.label}</span>
            {item.path === '/returns' && urgentReturnsCount > 0 && (
              <StatusBadge label={`ค้างนาน ${urgentReturnsCount}`} tone="danger" icon="🔴" />
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
