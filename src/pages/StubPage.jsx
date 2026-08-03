import Card from '../components/ui/Card'
import PageHeader from '../components/layout/PageHeader'

// หน้าโครงชั่วคราว — โมดูลนี้ยังไม่ถูกสร้างจริง รอทำในขั้นถัดไปทีละโมดูลตามที่ตกลงกัน
export default function StubPage({ title, moduleRef }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <p style={{ fontSize: 18, margin: 0 }}>
          🚧 โมดูลนี้ยังไม่ถูกสร้าง — รอลงรายละเอียดตามสเปก {moduleRef} ในขั้นถัดไป
        </p>
      </Card>
    </div>
  )
}
