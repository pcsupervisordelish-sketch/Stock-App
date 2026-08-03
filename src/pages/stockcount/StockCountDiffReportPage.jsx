import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fetchDiffReport, editCountedQty } from '../../services/stockCountService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function StockCountDiffReportPage() {
  const { session } = useAuth()
  const { show } = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [threshold, setThreshold] = useState(3)
  const [editRow, setEditRow] = useState(null) // row ที่กำลังแก้ไข
  const [editValue, setEditValue] = useState(0)
  const [editReason, setEditReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = () => {
    setError(null)
    setRefreshing(true)
    fetchDiffReport(session.branchCode)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false))
  }

  useEffect(load, [session.branchCode])

  const openEdit = (row) => {
    setEditRow(row)
    setEditValue(Number(row['นับจริง (รับข้อมูลจากการนับ)'] || 0))
    setEditReason('')
  }

  const handleSaveEdit = async () => {
    if (!editReason.trim()) {
      show('กรุณากรอกเหตุผลที่แก้ไข', { type: 'error' })
      return
    }
    setSaving(true)
    try {
      await editCountedQty(editRow.rowId, editValue, editRow['จำนวนหน้าร้าน SAP'], {
        editedBy: session.employeeName,
        editReason: editReason.trim()
      })
      show('แก้ไขสำเร็จ', { type: 'success' })
      setEditRow(null)
      load()
    } catch (err) {
      show(err.message || 'แก้ไขไม่สำเร็จ', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const abnormalCount = rows?.filter((r) => Math.abs(Number(r['ผลต่าง Diff'] || 0)) >= threshold).length || 0

  return (
    <div>
      <PageHeader
        title="ผลการนับ (Diff Report)"
        subtitle={rows ? `${rows.length} SKU • ผิดปกติเกิน threshold ${abnormalCount} รายการ` : undefined}
        right={
          <Link to="/stock-count/missing" style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 700 }}>
            SKU ที่ไม่ถูกนับ ›
          </Link>
        }
      />

      {error && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดไม่สำเร็จ: {error}</p>
          <Button variant="secondary" onClick={load} loading={refreshing} loadingText="" style={{ marginTop: 12 }}>ลองใหม่</Button>
        </Card>
      )}

      {rows === null && !error && <p>กำลังโหลด...</p>}
      {rows !== null && rows.length === 0 && <Card><p style={{ margin: 0 }}>ยังไม่มีข้อมูลการนับวันนี้</p></Card>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <label style={{ fontSize: 15 }}>Threshold ไฮไลต์ diff:</label>
        <input
          type="number"
          value={threshold}
          min={0}
          onChange={(e) => setThreshold(Number(e.target.value))}
          style={{ width: 60, textAlign: 'center', borderRadius: 6, border: '2px solid var(--color-border)' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows?.map((row) => {
          const diff = Number(row['ผลต่าง Diff'] || 0)
          const isAbnormal = Math.abs(diff) >= threshold
          return (
            <Card
              key={row.rowId}
              style={isAbnormal ? { borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)' } : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{row['ชื่อสินค้า']}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{row['รหัสสินค้า']} • {row['คลังสินค้า']}</div>
                  <div style={{ fontSize: 14, marginTop: 6 }}>
                    SAP: {row['จำนวนหน้าร้าน SAP']} {row['หน่วยนับ หน้าร้าน']} → นับจริง:{' '}
                    <strong>{row['นับจริง (รับข้อมูลจากการนับ)']}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: diff === 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {diff > 0 ? `+${diff}` : diff}
                  </div>
                  <Button variant="secondary" size="md" fullWidth={false} onClick={() => openEdit(row)} style={{ marginTop: 8 }}>
                    แก้ไข
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!editRow}
        title="แก้ไขยอดนับ"
        message={
          <div>
            {editRow?.['ชื่อสินค้า']} — SAP: {editRow?.['จำนวนหน้าร้าน SAP']} {editRow?.['หน่วยนับ หน้าร้าน']}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>จำนวนนับใหม่</label>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(Number(e.target.value))}
                style={{ width: '100%', fontSize: 22, padding: 10, borderRadius: 8, border: '2px solid var(--color-border)', marginBottom: 12 }}
              />
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>เหตุผลที่แก้ไข (บังคับ)</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                style={{ width: '100%', fontSize: 16, padding: 10, borderRadius: 8, border: '2px solid var(--color-border)' }}
              />
            </div>
          </div>
        }
        confirmLabel="บันทึกการแก้ไข"
        loading={saving}
        onConfirm={handleSaveEdit}
        onCancel={() => setEditRow(null)}
      />
    </div>
  )
}
