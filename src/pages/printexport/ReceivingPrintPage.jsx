import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchReceivingBatches } from '../../services/receivingService'
import { usePrintVersion } from '../../hooks/usePrintVersion'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import DocumentHeader from '../../components/print/DocumentHeader'
import PrintExportActions from '../../components/print/PrintExportActions'

export default function ReceivingPrintPage() {
  const { batchId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [batches, setBatches] = useState(null)
  const [error, setError] = useState(null)
  const printRef = useRef(null)

  useEffect(() => {
    fetchReceivingBatches(session.branchCode).then(setBatches).catch((err) => setError(err.message))
  }, [session.branchCode])

  const selected = batches?.find((b) => b.batchId === batchId)
  const printVersion = usePrintVersion(`receiving_${batchId}`, selected?.rows || [])

  if (!batchId) {
    return (
      <div>
        <PageHeader title="ปริ้น: บันทึกรับเข้า" subtitle="เลือก batch ที่สรุปผลแล้ว" />
        {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
        {batches === null && !error && <p>กำลังโหลด...</p>}
        {batches !== null && batches.length === 0 && <Card><p style={{ margin: 0 }}>ยังไม่มี batch รับเข้าที่สรุปผลแล้ว</p></Card>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {batches?.map((b) => (
            <Card key={b.batchId} as={Link} to={`/print-export/receiving/${b.batchId}`} style={{ textDecoration: 'none', color: 'var(--color-text)' }}>
              <div style={{ fontWeight: 700 }}>{b.date} {b.time}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{b.rows.length} SKU</div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!selected) {
    return (
      <div>
        <PageHeader title="ปริ้น: บันทึกรับเข้า" />
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="ปริ้น: บันทึกรับเข้า" right={<button onClick={() => navigate('/print-export/receiving')} style={linkBtn}>‹ เลือก batch อื่น</button>} />

      <div className="print-area" ref={printRef} style={{ background: 'white', padding: 20, borderRadius: 'var(--radius)' }}>
        <DocumentHeader
          docTypeName={`บันทึกรับเข้า — ${selected.date} ${selected.time}`}
          branchName={session.branchName}
          employeeName={session.employeeName}
          printLog={printVersion.log}
        />
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>SKU</th>
              <th style={th}>ชื่อสินค้า</th>
              <th style={th}>ใบส่งของ</th>
              <th style={th}>จริง</th>
              <th style={th}>ผลต่าง</th>
              <th style={th}>หน่วย</th>
            </tr>
          </thead>
          <tbody>
            {selected.rows.map((r) => (
              <tr key={r.rowId}>
                <td style={td}>{r.SKU}</td>
                <td style={td}>{r['ชื่อสินค้า']}</td>
                <td style={td}>{r['จำนวนตามใบส่งของ']}</td>
                <td style={td}>{r['จำนวนจริงที่รับ']}</td>
                <td style={{ ...td, color: Number(r['ผลต่าง (ขาด-เกิน)']) === 0 ? 'inherit' : '#B91C1C', fontWeight: 700 }}>
                  {r['ผลต่าง (ขาด-เกิน)']}
                </td>
                <td style={td}>{r['หน่วย']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <PrintExportActions
          printAreaRef={printRef}
          printVersion={printVersion}
          filename={`receiving_${selected.date}`}
        />
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #111' }
const td = { padding: '8px 10px', borderBottom: '1px solid #ddd' }
const linkBtn = { background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
