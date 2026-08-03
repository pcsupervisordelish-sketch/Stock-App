import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchSubmittedCountDates } from '../../services/stockCountService'
import { usePrintVersion } from '../../hooks/usePrintVersion'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import DocumentHeader from '../../components/print/DocumentHeader'
import PrintExportActions from '../../components/print/PrintExportActions'

export default function CompanyCountPrintPage() {
  const { date } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [days, setDays] = useState(null)
  const [error, setError] = useState(null)
  const printRef = useRef(null)

  useEffect(() => {
    fetchSubmittedCountDates(session.branchCode).then(setDays).catch((err) => setError(err.message))
  }, [session.branchCode])

  const selected = days?.find((d) => d.date === date)
  const printVersion = usePrintVersion(`companycount_${date}`, selected?.rows || [])

  if (!date) {
    return (
      <div>
        <PageHeader title="ปริ้น: ยอดกระทบสิ้นวัน (สาขาบริษัท)" subtitle="เลือกรอบนับที่ยืนยันส่งข้อมูลแล้ว" />
        {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
        {days === null && !error && <p>กำลังโหลด...</p>}
        {days !== null && days.length === 0 && <Card><p style={{ margin: 0 }}>ยังไม่มีรอบนับที่ยืนยันแล้ว</p></Card>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {days?.map((d) => (
            <Card key={d.date} as={Link} to={`/print-export/company-count/${d.date}`} style={{ textDecoration: 'none', color: 'var(--color-text)' }}>
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
      <PageHeader title={`ปริ้น: ยอดกระทบสิ้นวัน ${date}`} right={<button onClick={() => navigate('/print-export/company-count')} style={linkBtn}>‹ เลือกวันอื่น</button>} />

      <div className="print-area" ref={printRef} style={{ background: 'white', padding: 20, borderRadius: 'var(--radius)' }}>
        <DocumentHeader
          docTypeName={`ยอดกระทบสิ้นวัน (สาขาบริษัท) — ${date}`}
          branchName={session.branchName}
          employeeName={session.employeeName}
          printLog={printVersion.log}
        />
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>รหัสสินค้า</th>
              <th style={th}>ชื่อสินค้า</th>
              <th style={th}>รหัสคลัง</th>
              <th style={th}>คลังสินค้า</th>
              <th style={th}>จำนวนในระบบ SAP</th>
              <th style={th}>หน่วยนับหลัก</th>
              <th style={th}>หน่วย Convert</th>
              <th style={th}>จำนวนหน้าร้าน SAP</th>
              <th style={th}>หน่วยนับ หน้าร้าน</th>
              <th style={th}>นับจริง</th>
              <th style={th}>ผลต่าง Diff</th>
            </tr>
          </thead>
          <tbody>
            {selected.rows.map((r) => (
              <tr key={r.rowId}>
                <td style={td}>{r['รหัสสินค้า']}</td>
                <td style={td}>{r['ชื่อสินค้า']}</td>
                <td style={td}>{r['รหัสคลัง']}</td>
                <td style={td}>{r['คลังสินค้า']}</td>
                <td style={td}>{r['จำนวนในระบบ SAP']}</td>
                <td style={td}>{r['หน่วยนับหลัก']}</td>
                <td style={td}>{r['หน่วย Convert']}</td>
                <td style={td}>{r['จำนวนหน้าร้าน SAP']}</td>
                <td style={td}>{r['หน่วยนับ หน้าร้าน']}</td>
                <td style={td}>{r['นับจริง (รับข้อมูลจากการนับ)']}</td>
                <td style={{ ...td, fontWeight: 700, color: Number(r['ผลต่าง Diff']) === 0 ? 'inherit' : '#B91C1C' }}>
                  {r['ผลต่าง Diff']}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <PrintExportActions printAreaRef={printRef} printVersion={printVersion} filename={`companycount_${date}`} />
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #111', whiteSpace: 'nowrap', fontSize: 11 }
const td = { padding: '6px 8px', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }
const linkBtn = { background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
