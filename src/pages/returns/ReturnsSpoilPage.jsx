import { useNavigate } from 'react-router-dom'
import { RETURN_CATEGORIES } from '../../config/returnCategories'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'

// หน้าย่อยของ "เสีย" — แยกเป็นเมนูของตัวเองเพื่อไม่ให้หน้าแรกของบันทึก/ตีคืนสินค้ารกเกินไป
// (เดิมโชว์ "เสียคัดออก" กับ "เสียทำลายหน้าร้าน" เป็น 2 การ์ดคู่กันในหน้าแรกเลย)
// กดเข้ามาแล้วค่อยเลือกอีกทีว่าจะบันทึกแบบไหน ก่อนไปหน้าสแกนตามปกติ
export default function ReturnsSpoilPage() {
  const navigate = useNavigate()
  const spoilCategories = RETURN_CATEGORIES.filter((c) => c.group === 'เสีย')

  return (
    <div>
      <PageHeader title="🔴 เสีย" subtitle="เลือกประเภทของเสียที่ต้องการบันทึก" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {spoilCategories.map((c) => (
          <Card
            key={c.value}
            onClick={() => navigate(`/returns/scan/${encodeURIComponent(c.value)}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 84 }}
          >
            <span style={{ fontSize: 28 }}>{c.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.description}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
