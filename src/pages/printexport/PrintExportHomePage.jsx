import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'

export default function PrintExportHomePage() {
  const { session } = useAuth()

  const items = [
    { path: '/print-export/receiving', icon: '📥', label: 'บันทึกรับเข้า', desc: 'ทุกสาขา — เฉพาะ batch ที่สรุปผลแล้ว' },
    { path: '/print-export/returns', icon: '📤', label: 'มียอดตีคืน', desc: 'ทุกสาขา — เลือกได้หลายวัน' },
    session.branchType === 'ห้าง' && {
      path: '/print-export/dept-closing',
      icon: '📊',
      label: 'ยอดกระทบสิ้นวัน (สาขาห้าง)',
      desc: 'เฉพาะวันที่ล็อกแล้ว'
    },
    session.branchType === 'บริษัท' && {
      path: '/print-export/company-count',
      icon: '📦',
      label: 'ยอดกระทบสิ้นวัน (สาขาบริษัท)',
      desc: 'เทียบ SAP กับของจริง'
    }
  ].filter(Boolean)

  return (
    <div>
      <PageHeader title="ปริ้น / Export" subtitle="เลือกหมวดหมู่เอกสารก่อนเสมอ ทำได้ทีละหมวดหมู่" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item) => (
          <Card key={item.path} as={Link} to={item.path} style={{ textDecoration: 'none', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 30 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{item.label}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{item.desc}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
