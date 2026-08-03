import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchAllSlipsForPrint } from '../../services/returnsService'
import { getCategory } from '../../config/returnCategories'
import { usePrintVersion } from '../../hooks/usePrintVersion'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'
import DocumentHeader from '../../components/print/DocumentHeader'
import PrintExportActions from '../../components/print/PrintExportActions'

// ลำดับการแสดงหมวด: "เสีย" ขึ้นก่อนเสมอ ตามด้วย แถม/เคลม/อื่นๆ (ตามสเปก F2)
const CATEGORY_ORDER = ['เสียคัดออก', 'เสียทำลายหน้าร้าน', 'แถม', 'เคลม', 'อื่นๆ']

export default function ReturnsPrintPage() {
  const { session } = useAuth()
  const [slips, setSlips] = useState(null)
  const [error, setError] = useState(null)
  const [selectedDates, setSelectedDates] = useState(() => new Set())
  const printRef = useRef(null)

  useEffect(() => {
    fetchAllSlipsForPrint(session.branchCode).then(setSlips).catch((err) => setError(err.message))
  }, [session.branchCode])

  const selectedRows = useMemo(() => {
    if (!slips) return []
    return slips
      .filter((s) => selectedDates.has(s.date))
      .flatMap((s) => s.rows)
      .sort((a, b) => CATEGORY_ORDER.indexOf(a['หมวด']) - CATEGORY_ORDER.indexOf(b['หมวด']))
  }, [slips, selectedDates])

  const withPhysical = selectedRows.filter((r) => getCategory(r['หมวด'])?.hasPhysicalReturn)
  const withoutPhysical = selectedRows.filter((r) => !getCategory(r['หมวด'])?.hasPhysicalReturn)

  const docId = `returns_${Array.from(selectedDates).sort().join('-')}`
  const printVersion = usePrintVersion(docId, selectedRows)

  const toggle = (date) => {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  return (
    <div>
      <PageHeader title="ปริ้น: มียอดตีคืน" subtitle="เลือกได้หลายวันพร้อมกัน" />

      {error && <Card><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p></Card>}
      {slips === null && !error && <p>กำลังโหลด...</p>}
      {slips !== null && slips.length === 0 && <Card><p style={{ margin: 0 }}>ยังไม่มีใบตีคืน</p></Card>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {slips?.map((s) => (
          <Card key={s.date} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <input type="checkbox" checked={selectedDates.has(s.date)} onChange={() => toggle(s.date)} style={{ width: 24, height: 24 }} />
            <div>
              <div style={{ fontWeight: 700 }}>{s.date}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{s.rows.length} รายการ</div>
            </div>
          </Card>
        ))}
      </div>

      {selectedRows.length > 0 && (
        <>
          <div className="print-area" ref={printRef} style={{ background: 'white', padding: 20, borderRadius: 'var(--radius)' }}>
            <DocumentHeader
              docTypeName={`ใบตีคืน — ${Array.from(selectedDates).sort().join(', ')}`}
              branchName={session.branchName}
              employeeName={session.employeeName}
              printLog={printVersion.log}
            />

            {withPhysical.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>มีของจริง (ต้องมีคนเซ็นรับ)</h3>
                <ReturnTable rows={withPhysical} withSignature />
              </>
            )}

            {withoutPhysical.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, marginTop: 20, marginBottom: 8 }}>ไม่มีของจริง</h3>
                <ReturnTable rows={withoutPhysical} withSignature={false} />
              </>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <PrintExportActions printAreaRef={printRef} printVersion={printVersion} filename={`returns_${Array.from(selectedDates).join('_')}`} />
          </div>
        </>
      )}
    </div>
  )
}

function ReturnTable({ rows, withSignature }) {
  return (
    <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse', marginBottom: 12 }}>
      <thead>
        <tr>
          <th style={th}>SKU</th>
          <th style={th}>ชื่อสินค้า</th>
          <th style={th}>หมวด</th>
          <th style={th}>จำนวน</th>
          <th style={th}>หน่วย</th>
          <th style={th}>หมายเหตุ</th>
          {withSignature && <th style={th}>เซ็นรับ</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.rowId}>
            <td style={td}>{r.SKU}</td>
            <td style={td}>{r['ชื่อสินค้า']}</td>
            <td style={td}>{r['หมวด']}</td>
            <td style={td}>{r['จำนวน']}</td>
            <td style={td}>{r['หน่วย']}</td>
            <td style={td}>{r['หมายเหตุ']}</td>
            {withSignature && <td style={{ ...td, width: 100 }}></td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #111' }
const td = { padding: '8px 10px', borderBottom: '1px solid #ddd' }
