import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchLockedReconciliationDates } from '../../services/reconciliationService'
import { usePrintVersion } from '../../hooks/usePrintVersion'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import DocumentHeader from '../../components/print/DocumentHeader'
import PrintExportActions from '../../components/print/PrintExportActions'
import StatusBadge, { reconciliationStatusTone } from '../../components/ui/StatusBadge'

export default function DeptClosingPrintPage() {
  const { date } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [days, setDays] = useState(null)
  const [error, setError] = useState(null)
  const printRef = useRef(null)

  useEffect(() => {
    fetchLockedReconciliationDates(session.branchCode).then(setDays).catch((err) => setError(err.message))
  }, [session.branchCode])

  const selected = days?.find((d) => d.date === date)
  const printVersion = usePrintVersion(`deptclosing_${date}`, selected?.rows || [])

  if (!date) {
    return (
      <div>
        <PageHeader title="ปริ้น: ยอดกระทบสิ้นวัน (สาขาห้าง)" subtitle="เฉพาะวันที่สรุปส่งข้อมูลแล้ว (ล็อกแล้ว)" />
        {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
        {days === null && !error && <p>กำลังโหลด...</p>}
        {days !== null && days.length === 0 && <Card><p style={{ margin: 0 }}>ยังไม่มีวันที่ล็อกแล้ว</p></Card>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {days?.map((d) => (
            <Card key={d.date} as={Link} to={`/print-export/dept-closing/${d.date}`} style={{ textDecoration: 'none', color: 'var(--color-text)' }}>
              <div style={{ fontWeight: 700 }}>{d.date}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{d.rows.length} SKU</div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!selected) {
    return (
      <div>
        <PageHeader title="ปริ้น: ยอดกระทบสิ้นวัน" />
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`ปริ้น: ยอดกระทบสิ้นวัน ${date}`} right={<button onClick={() => navigate('/print-export/dept-closing')} style={linkBtn}>‹ เลือกวันอื่น</button>} />

      <div className="print-area" ref={printRef} style={{ background: 'white', padding: 20, borderRadius: 'var(--radius)' }}>
        <DocumentHeader
          docTypeName={`ยอดกระทบสิ้นวัน (สาขาห้าง) — ${date}`}
          branchName={session.branchName}
          employeeName={session.employeeName}
          printLog={printVersion.log}
        />
        <p style={{ fontSize: 13, color: '#666', marginTop: -8, marginBottom: 12 }}>
          * ยอดขายได้เป็นตัวเลข "โดยประมาณ" เท่านั้น ไม่ใช่ยอดขายจริงยืนยัน 100% (ไม่มี POS อิสระมาเทียบ)
        </p>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>SKU</th>
              <th style={th}>ชื่อสินค้า</th>
              <th style={th}>เปิดร้าน</th>
              <th style={th}>รับเข้า</th>
              <th style={th}>เสียคัดออก</th>
              <th style={th}>เสียทำลาย</th>
              <th style={th}>แถม</th>
              <th style={th}>เคลม</th>
              <th style={th}>อื่นๆ</th>
              <th style={th}>ควรจะเหลือ</th>
              <th style={th}>ปิดร้านจริง</th>
              <th style={th}>ขายได้โดยประมาณ</th>
              <th style={th}>Diff</th>
              <th style={th}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {selected.rows.map((r) => (
              <tr key={r.rowId || r['รหัสสินค้า']}>
                <td style={td}>{r['รหัสสินค้า']}</td>
                <td style={td}>{r['ชื่อสินค้า']}</td>
                <td style={td}>{r['นับเปิดร้าน']}</td>
                <td style={td}>{r['รับเข้า']}</td>
                <td style={td}>{r['เสียคัดออก']}</td>
                <td style={td}>{r['เสียทำลายหน้าร้าน']}</td>
                <td style={td}>{r['แถม']}</td>
                <td style={td}>{r['เคลม']}</td>
                <td style={td}>{r['อื่นๆ']}</td>
                <td style={td}>{r['ควรจะเหลือ']}</td>
                <td style={td}>{r['นับปิดร้านจริง']}</td>
                <td style={{ ...td, fontWeight: 700 }}>{r['ขายได้ (ที่คำนวนได้ตามจริง)']}</td>
                <td style={td}>{r['หายจากการบันทึก (Diff)']}</td>
                <td style={td}>
                  <StatusBadge label={r['สถานะ']} {...reconciliationStatusTone(r['สถานะ'])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <PrintExportActions printAreaRef={printRef} printVersion={printVersion} filename={`deptclosing_${date}`} />
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #111', whiteSpace: 'nowrap', fontSize: 12 }
const td = { padding: '6px 8px', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }
const linkBtn = { background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
