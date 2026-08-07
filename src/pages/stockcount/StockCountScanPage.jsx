import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { fetchTodayBaseline, hasTodaySubmittedCount } from '../../services/stockCountService'
import { parseScannedCode } from '../../utils/parseScannedCode'
import { todayKey } from '../../utils/dateUtils'
import { newTransactionId } from '../../utils/transactionId'
import QRScanner from '../../components/ui/QRScanner'
import NumericInput from '../../components/ui/NumericInput'
import QtyStepper from '../../components/ui/QtyStepper'
import DiscardDraftButton from '../../components/ui/DiscardDraftButton'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StickyActionBar from '../../components/layout/StickyActionBar'

export function stockCountDraftKey(branchCode) {
  return `stockcount:${branchCode}:${todayKey()}`
}

export default function StockCountScanPage() {
  const { session } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()

  const [baseline, setBaseline] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [locked, setLocked] = useState(false)
  const [needsImport, setNeedsImport] = useState(false)

  const draftKey = stockCountDraftKey(session.branchCode)
  const { data: items, save, clearAfterSubmit, hasRestorableDraft, draftPreview, restoreDraft, discardDraft } =
    useDraftAutosave(draftKey, [])

  const [pendingItem, setPendingItem] = useState(null)
  const [manualName, setManualName] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [looking, setLooking] = useState(false)
  const [duplicateOf, setDuplicateOf] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [baselineRows, submitted] = await Promise.all([
          fetchTodayBaseline(session.branchCode),
          hasTodaySubmittedCount(session.branchCode)
        ])
        if (cancelled) return
        if (submitted) {
          setLocked(true)
        } else if (baselineRows.length === 0) {
          setNeedsImport(true)
        }
        setBaseline(baselineRows)
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.branchCode])

  const baselineMap = useMemo(() => {
    const map = new Map()
    baseline?.forEach((b) => map.set(b.sku, b))
    return map
  }, [baseline])

  const countedSkuSet = useMemo(() => new Set(items.map((i) => i.sku)), [items])
  const progress = baseline?.length ? Math.round((countedSkuSet.size / baseline.length) * 100) : 0

  const handleDetected = (raw) => {
    if (looking) return
    const { sku, weight } = parseScannedCode(raw)
    if (!sku) {
      show('อ่านรหัสไม่ได้ กรุณาลองสแกนใหม่หรือกรอกรหัสมือ', { type: 'error' })
      return
    }
    const base = baselineMap.get(sku)
    if (base) {
      setPendingItem({ ...base, offBaseline: false })
      setQuantity(0)
    } else {
      setPendingItem({ sku, name: '', whCode: '', whName: '', sapQtySystem: '', mainUnit: '', convertUnit: '', sapQtyFront: 0, frontUnit: '', offBaseline: true })
      setManualName('')
      setQuantity(0)
    }
  }

  const resetEntry = () => {
    setPendingItem(null)
    setManualName('')
    setQuantity(0)
  }

  const addToDraft = (replaceIndex = null) => {
    const name = pendingItem.offBaseline ? manualName.trim() : pendingItem.name
    if (pendingItem.offBaseline && !name) {
      show('กรุณากรอกชื่อสินค้า (ไม่พบในไฟล์ SAP)', { type: 'error' })
      return
    }
    const newItem = {
      rowId: replaceIndex !== null ? items[replaceIndex].rowId : newTransactionId('row'),
      ...pendingItem,
      name,
      countedQty: quantity
    }
    if (replaceIndex !== null) {
      const next = [...items]
      next[replaceIndex] = newItem
      save(next)
    } else {
      save([...items, newItem])
    }
    show(`บันทึก "${name}" = ${quantity} แล้ว`, { type: 'success' })
    resetEntry()
  }

  const handleConfirmAdd = () => {
    const existingIndex = items.findIndex((it) => it.sku === pendingItem.sku)
    if (existingIndex !== -1) {
      setDuplicateOf(existingIndex)
      return
    }
    addToDraft(null)
  }

  const removeItem = (index) => save(items.filter((_, i) => i !== index))
  const updateQty = (index, qty) => {
    const next = [...items]
    next[index] = { ...next[index], countedQty: qty }
    save(next)
  }

  if (locked) {
    return (
      <div>
        <PageHeader title="สแกนนับสต๊อก" />
        <Card>
          <p style={{ margin: 0 }}>วันนี้ส่งข้อมูลนับสต๊อกไปแล้ว ดูผลได้ที่หน้าผลการนับ</p>
          <Button onClick={() => navigate('/stock-count/report')} style={{ marginTop: 16 }}>
            ไปหน้าผลการนับ
          </Button>
        </Card>
      </div>
    )
  }

  if (needsImport) {
    return (
      <div>
        <PageHeader title="สแกนนับสต๊อก" />
        <Card>
          <p style={{ margin: 0 }}>
            ยังไม่ได้ import ข้อมูลสต๊อกจาก SAP ของวันนี้ — ต้อง import ก่อนจึงจะเริ่มนับได้
          </p>
          <Button onClick={() => navigate('/stock-count/import')} style={{ marginTop: 16 }}>
            📥 Import ข้อมูล SAP
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="สแกนนับสต๊อก"
        subtitle={baseline ? `นับไปแล้ว ${countedSkuSet.size} / ${baseline.length} SKU (${progress}%)` : undefined}
      />

      {loadError && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลด baseline ไม่สำเร็จ: {loadError}</p>
        </Card>
      )}

      <ConfirmDialog
        open={hasRestorableDraft}
        title="พบข้อมูลที่ยังไม่ได้บันทึกจากครั้งก่อน"
        message={`นับไปแล้ว ${draftPreview?.length || 0} SKU ต้องการทำต่อจากเดิมหรือเริ่มใหม่?`}
        confirmLabel="ทำต่อจากเดิม"
        cancelLabel="เริ่มใหม่ (ลบของเดิม)"
        onConfirm={restoreDraft}
        onCancel={discardDraft}
      />

      <ConfirmDialog
        open={duplicateOf !== null}
        title="สแกนซ้ำ SKU เดิม"
        message={duplicateOf !== null ? `${items[duplicateOf]?.name} นับไปแล้ว = ${items[duplicateOf]?.countedQty} — รวมจำนวน หรือแก้ไขค่าเดิม?` : ''}
        confirmLabel="แก้ไขค่าเดิม (แทนที่)"
        cancelLabel="รวมจำนวน"
        onConfirm={() => {
          addToDraft(duplicateOf)
          setDuplicateOf(null)
        }}
        onCancel={() => {
          const idx = duplicateOf
          setDuplicateOf(null)
          const merged = [...items]
          merged[idx] = { ...merged[idx], countedQty: Number(merged[idx].countedQty) + Number(quantity) }
          save(merged)
          show('รวมจำนวนแล้ว', { type: 'success' })
          resetEntry()
        }}
      />

      {!pendingItem && (
        <Card style={{ marginBottom: 20 }}>
          <QRScanner onDetected={handleDetected} disabled={looking || !baseline} />
        </Card>
      )}

      {pendingItem && (
        <Card style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pendingItem.offBaseline && (
            <div style={{ background: 'var(--color-warning-bg)', color: '#5A3C00', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 15 }}>
              ⚠️ ไม่พบรหัส "{pendingItem.sku}" ในไฟล์ SAP วันนี้ — ยังบันทึกได้ แต่จะถูกแจ้งแยกในรายงาน
            </div>
          )}
          <div>
            <div style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>รหัสสินค้า</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{pendingItem.sku}</div>
          </div>
          {pendingItem.offBaseline ? (
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>ชื่อสินค้า</label>
              <input
                style={inputStyle}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>ชื่อสินค้า</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{pendingItem.name}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>
                SAP หน้าร้าน: {pendingItem.sapQtyFront} {pendingItem.frontUnit}
              </div>
            </div>
          )}

          <NumericInput label="จำนวนที่นับได้จริง" value={quantity} onChange={setQuantity} unit={pendingItem.frontUnit} />

          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={resetEntry}>ยกเลิก</Button>
            <Button onClick={handleConfirmAdd}>บันทึก</Button>
          </div>
        </Card>
      )}

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, margin: 0 }}>นับไปแล้ว ({items.length})</h2>
            <DiscardDraftButton
              label="ยกเลิกการนับทั้งหมด"
              confirmMessage="รายการที่นับไว้ทั้งหมดในรอบนี้จะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ"
              onDiscard={discardDraft}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 110 }}>
            {items.map((item, index) => (
              <Card key={item.rowId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {item.name} {item.offBaseline && <span style={{ fontSize: 12, color: 'var(--color-warning)' }}>(ไม่พบใน SAP)</span>}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{item.sku}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <QtyStepper value={item.countedQty} onChange={(qty) => updateQty(index, qty)} />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    aria-label="ลบรายการ"
                    style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 22, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <StickyActionBar>
            <Button onClick={() => navigate('/stock-count/summary')}>ไปหน้าสรุปก่อนยืนยัน ({items.length})</Button>
          </StickyActionBar>
        </>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  minHeight: 'var(--button-height)',
  fontSize: 20,
  padding: '0 16px',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)'
}
