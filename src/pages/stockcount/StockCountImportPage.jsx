import '../../components/ui/QRScanner.css' // ใช้ class .qrscanner__tab ร่วมกัน (ปุ่ม toggle 2 ตัวเลือก)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { parseSpreadsheetFile, parseTsvText } from '../../utils/spreadsheetParser'
import { BASELINE_FIELDS, guessMapping } from '../../config/stockCountMapping'
import { importBaseline } from '../../services/stockCountService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'

export default function StockCountImportPage() {
  const { session } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()
  const navigate = useNavigate()

  const [method, setMethod] = useState('paste') // 'paste' | 'file'
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState(null) // { fieldKey: columnIndex }
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleParse = async (source) => {
    setError(null)
    setParsing(true)
    try {
      const result = source instanceof File ? await parseSpreadsheetFile(source) : parseTsvText(source)
      if (result.rows.length === 0) throw new Error('ไม่พบข้อมูลแถวใดๆ ในไฟล์/ข้อความที่วาง')
      setParsed(result)
      setMapping(guessMapping(result.headers))
    } catch (err) {
      setError(err.message || 'อ่านข้อมูลไม่สำเร็จ')
    } finally {
      setParsing(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleParse(file)
  }

  const missingRequired = parsed
    ? BASELINE_FIELDS.filter((f) => f.required && (mapping[f.key] === null || mapping[f.key] === undefined))
    : []

  const buildMappedRows = () =>
    parsed.rows.map((row) => {
      const obj = {}
      BASELINE_FIELDS.forEach((field) => {
        const colIndex = mapping[field.key]
        obj[field.key] = colIndex !== null && colIndex !== undefined ? row[colIndex] : ''
      })
      return obj
    })

  const handleConfirmImport = async () => {
    if (missingRequired.length > 0) {
      show('กรุณาจับคู่คอลัมน์ที่จำเป็นให้ครบก่อน', { type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const mappedRows = buildMappedRows()
      const gps = await getCurrentPosition()
      const result = await importBaseline(mappedRows, { session, gps })
      show(result.skipped ? 'ข้อมูลนี้ import ไปแล้ว' : `Import สำเร็จ ${result.written} SKU`, { type: 'success' })
      navigate('/stock-count')
    } catch (err) {
      show(err.message || 'Import ไม่สำเร็จ กรุณาลองใหม่', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Import ข้อมูล SAP" subtitle="ทำครั้งเดียวก่อนเริ่มนับของวันนี้" />

      {!parsed && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="qrscanner__tabs">
            <button
              type="button"
              className={`qrscanner__tab ${method === 'paste' ? 'is-active' : ''}`}
              onClick={() => setMethod('paste')}
            >
              📋 วางจาก Clipboard
            </button>
            <button
              type="button"
              className={`qrscanner__tab ${method === 'file' ? 'is-active' : ''}`}
              onClick={() => setMethod('file')}
            >
              📁 อัปโหลดไฟล์
            </button>
          </div>

          {method === 'paste' ? (
            <>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 15 }}>
                จากหน้า SAP คลิกขวา "Copy Table" แล้วมาวาง (Ctrl+V) ในช่องนี้
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                style={{ width: '100%', fontSize: 15, padding: 12, borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', fontFamily: 'monospace' }}
                placeholder="วางข้อมูลจาก SAP ที่นี่..."
              />
              <Button onClick={() => handleParse(pasteText)} loading={parsing} disabled={!pasteText.trim()}>
                อ่านข้อมูล
              </Button>
            </>
          ) : (
            <>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
              {parsing && <p>กำลังอ่านไฟล์...</p>}
            </>
          )}

          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
        </Card>
      )}

      {parsed && mapping && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>จับคู่คอลัมน์ ({parsed.rows.length} แถวที่พบ)</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              ระบบจับคู่อัตโนมัติจากหัวคอลัมน์ที่พบแล้ว ตรวจสอบ/แก้ไขได้ก่อนยืนยัน
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {BASELINE_FIELDS.map((field) => (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>
                    {field.label} {field.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  </label>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value === '' ? null : Number(e.target.value) }))
                    }
                    style={{ flex: 1, minHeight: 44, borderRadius: 'var(--radius-sm)', border: '2px solid var(--color-border)' }}
                  >
                    <option value="">— ไม่ใช้ —</option>
                    {parsed.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `(คอลัมน์ ${i + 1})`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <p style={{ color: 'var(--color-danger)', marginTop: 12, fontSize: 14 }}>
                ยังไม่ได้จับคู่: {missingRequired.map((f) => f.label).join(', ')}
              </p>
            )}
          </Card>

          <Card style={{ marginBottom: 16, overflowX: 'auto' }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>ตัวอย่างข้อมูล (5 แถวแรก)</h2>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {BASELINE_FIELDS.map((f) => (
                    <th key={f.key} style={thStyle}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row, ri) => (
                  <tr key={ri}>
                    {BASELINE_FIELDS.map((f) => {
                      const idx = mapping[f.key]
                      return <td key={f.key} style={tdStyle}>{idx !== null && idx !== undefined ? row[idx] : '-'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
            <Button variant="secondary" onClick={() => setParsed(null)}>
              เริ่มใหม่
            </Button>
            <Button onClick={handleConfirmImport} loading={submitting} disabled={missingRequired.length > 0}>
              ยืนยัน Import ({parsed.rows.length} SKU)
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid var(--color-border)', whiteSpace: 'nowrap' }
const tdStyle = { padding: '6px 8px', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }
