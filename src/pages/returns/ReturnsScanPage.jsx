import StickyActionBar from '../../components/layout/StickyActionBar'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { getCategory, getNoteHistory, saveNoteToHistory } from '../../config/returnCategories'
import { lookupProduct, confirmDraftBatch } from '../../services/returnsService'
import { fetchProductMasterEntries, toLookupMap } from '../../services/productMasterCache'
import { useCachedData } from '../../hooks/useCachedData'
import { parseScannedCode } from '../../utils/parseScannedCode'
import { todayKey } from '../../utils/dateUtils'
import { newTransactionId } from '../../utils/transactionId'
import QRScanner from '../../components/ui/QRScanner'
import BottomSheetModal from '../../components/ui/BottomSheetModal'
import NumericInput from '../../components/ui/NumericInput'
import QtyStepper from '../../components/ui/QtyStepper'
import DiscardDraftButton from '../../components/ui/DiscardDraftButton'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import RefreshMasterButton from '../../components/ui/RefreshMasterButton'
import WorkDateTimeBar from '../../components/ui/WorkDateTimeBar'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function ReturnsScanPage() {
  const { category: categoryParam } = useParams()
  const category = getCategory(decodeURIComponent(categoryParam))
  const { session } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()
  const navigate = useNavigate()

  const draftKey = `returns:${session.branchCode}:${todayKey()}`
  const { data: items, save, clearAfterSubmit, hasRestorableDraft, draftPreview, restoreDraft, discardDraft } =
    useDraftAutosave(draftKey, [])

  // แคชรายการสินค้าทั้งชุดไว้ในเครื่อง lookup ทันทีไม่ต้องรอ network ทุกครั้งที่สแกน (แก้ปัญหาช้า)
  const masterCacheKey = `productMaster:${session.branchType}:${session.branchCode}`
  const { data: masterEntries, refreshing: masterRefreshing, refresh: refreshMaster } = useCachedData(
    masterCacheKey,
    () => fetchProductMasterEntries(session.branchType, session.branchCode)
  )
  const masterMap = toLookupMap(masterEntries)

  const [pendingProduct, setPendingProduct] = useState(null) // { sku, name, unit } | null
  const [manualName, setManualName] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [looking, setLooking] = useState(false)
  const [duplicateOf, setDuplicateOf] = useState(null) // index ของรายการซ้ำในหมวดเดียวกัน
  const [submitting, setSubmitting] = useState(false)

  if (!category) {
    return (
      <div>
        <PageHeader title="ไม่พบหมวดที่เลือก" />
        <Button onClick={() => navigate('/returns')}>กลับหน้าหลัก</Button>
      </div>
    )
  }

  const handleDetected = async (raw) => {
    if (looking) return
    setNotFound(false)
    setPendingProduct(null)
    // QR สินค้าจริงเข้ารหัสเป็น "รหัสสินค้า|น้ำหนัก" (เช่น FG0001|0.5) ต้องแยกก่อนค้นหาเสมอ
    // ห้ามเอาสตริงดิบทั้งก้อนไปค้นหาตรงๆ ไม่งั้นจะหาไม่เจอทุกครั้ง (sku ถูก uppercase มาแล้ว)
    // หมายเหตุ: จงใจไม่เอาน้ำหนักมาเติมจำนวนอัตโนมัติ — ให้พนักงานกรอก/กด +/- เองเสมอ
    const { sku } = parseScannedCode(raw)
    if (!sku) {
      show('อ่านรหัสไม่ได้ กรุณาลองสแกนใหม่หรือกรอกรหัสมือ', { type: 'error' })
      return
    }

    // เช็คแคชในเครื่องก่อนเสมอ (เร็วระดับ millisecond ไม่ต้องรอ network) — แก้ปัญหาช้า 5-7 วิ/SKU
    const cached = masterMap.get(sku)
    if (cached) {
      setPendingProduct(cached)
      setQuantity(0)
      setNote('')
      return
    }

    // ไม่เจอในแคช -> อาจเป็น SKU ใหม่ที่เพิ่งเพิ่มหลัง cache โหลดไป เช็คซ้ำกับ Sheet สดอีกที
    setLooking(true)
    try {
      const product = await lookupProduct(sku, { branchType: session.branchType, branchCode: session.branchCode })
      if (product) {
        setPendingProduct(product)
        setQuantity(0)
        setNote('')
      } else {
        setPendingProduct({ sku, name: '', unit: '' })
        setManualName('')
        setNotFound(true)
        setQuantity(0)
      }
    } catch (err) {
      show(err.message || 'ค้นหาสินค้าไม่สำเร็จ', { type: 'error' })
    } finally {
      setLooking(false)
    }
  }

  const resetEntry = () => {
    setPendingProduct(null)
    setNotFound(false)
    setManualName('')
    setQuantity(1)
    setNote('')
  }

  const addToDraft = (replaceIndex = null) => {
    const name = notFound ? manualName.trim() : pendingProduct.name
    if (!name) {
      show('กรุณากรอกชื่อสินค้า', { type: 'error' })
      return
    }
    if (category.requiresNote && !note.trim()) {
      show('หมวด "อื่นๆ" ต้องกรอกเหตุผลก่อนบันทึก', { type: 'error' })
      return
    }

    const newItem = {
      rowId: replaceIndex !== null ? items[replaceIndex].rowId : newTransactionId('row'),
      sku: pendingProduct.sku,
      name,
      unit: pendingProduct.unit || '',
      category: category.value,
      quantity,
      note: note.trim()
    }

    if (category.requiresNote) saveNoteToHistory(note)

    if (replaceIndex !== null) {
      const next = [...items]
      next[replaceIndex] = newItem
      save(next)
    } else {
      save([...items, newItem])
    }

    show(`เพิ่ม "${name}" จำนวน ${quantity} แล้ว`, { type: 'success' })
    resetEntry()
  }

  const handleConfirmAdd = () => {
    const existingIndex = items.findIndex((it) => it.sku === pendingProduct.sku && it.category === category.value)
    if (existingIndex !== -1) {
      setDuplicateOf(existingIndex)
      return
    }
    addToDraft(null)
  }

  const removeItem = (index) => {
    const next = items.filter((_, i) => i !== index)
    save(next)
  }

  const updateItemQuantity = (index, qty) => {
    const next = [...items]
    next[index] = { ...next[index], quantity: qty }
    save(next)
  }

  const handleSubmitAll = async () => {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const gps = await getCurrentPosition()
      const result = await confirmDraftBatch(items, { session, gps })
      if (result.skipped) {
        show('รายการนี้เคยส่งสำเร็จไปแล้ว', { type: 'info' })
      } else {
        show(`ยืนยันสำเร็จ ${result.written} รายการ`, { type: 'success' })
      }
      clearAfterSubmit()
      navigate('/returns')
    } catch (err) {
      show(err.message || 'ยืนยันไม่สำเร็จ กรุณาลองใหม่', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const noteHistory = getNoteHistory()

  return (
    <div>
      <PageHeader
        title={<span style={{ color: `var(--color-${category.tone})` }}>{category.icon} {category.label}</span>}
        subtitle={category.description}
        right={<RefreshMasterButton refreshing={masterRefreshing} onRefresh={refreshMaster} />}
      />
      <WorkDateTimeBar />

      <ConfirmDialog
        open={hasRestorableDraft}
        title="พบข้อมูลที่ยังไม่ได้บันทึกจากครั้งก่อน"
        message={`นับ/บันทึกไปแล้ว ${draftPreview?.length || 0} รายการวันนี้ ต้องการทำต่อจากเดิมหรือเริ่มใหม่?`}
        confirmLabel="ทำต่อจากเดิม"
        cancelLabel="เริ่มใหม่ (ลบของเดิม)"
        onConfirm={restoreDraft}
        onCancel={discardDraft}
      />

      <ConfirmDialog
        open={duplicateOf !== null}
        title="พบรายการซ้ำในหมวดนี้"
        message={
          duplicateOf !== null
            ? `${items[duplicateOf]?.name} มีอยู่แล้วจำนวน ${items[duplicateOf]?.quantity} ${items[duplicateOf]?.unit} — ต้องการรวมจำนวน หรือแก้ไขค่าเดิม?`
            : ''
        }
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
          merged[idx] = { ...merged[idx], quantity: Number(merged[idx].quantity) + Number(quantity) }
          save(merged)
          show('รวมจำนวนแล้ว', { type: 'success' })
          resetEntry()
        }}
      />

      <Card style={{ marginBottom: 20 }}>
        <QRScanner onDetected={handleDetected} disabled={looking} paused={!!pendingProduct} />
        {looking && <p style={{ marginTop: 10, color: 'var(--color-text-muted)' }}>กำลังค้นหาสินค้า...</p>}
      </Card>

      <BottomSheetModal open={!!pendingProduct} onClose={resetEntry}>
        {pendingProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {notFound && (
              <div style={{ background: 'var(--color-warning-bg)', color: '#5A3C00', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 15 }}>
                ⚠️ ไม่พบรหัส "{pendingProduct.sku}" ในระบบ กรุณากรอกชื่อสินค้าเอง และตรวจสอบรหัสให้ถูกต้อง
              </div>
            )}
            <div>
              <div style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>รหัสสินค้า</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{pendingProduct.sku}</div>
            </div>
            {notFound ? (
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
                <div style={{ fontSize: 20, fontWeight: 700 }}>{pendingProduct.name}</div>
              </div>
            )}

            <NumericInput label="จำนวน" value={quantity} onChange={setQuantity} unit={pendingProduct.unit} />

            {category.requiresNote && (
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>เหตุผล (บังคับกรอก)</label>
                <input
                  style={inputStyle}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  list="note-history"
                  placeholder="ระบุเหตุผล"
                />
                <datalist id="note-history">
                  {noteHistory.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="secondary" onClick={resetEntry}>
                ยกเลิก
              </Button>
              <Button onClick={handleConfirmAdd} disabled={quantity <= 0}>
                เพิ่มรายการ
              </Button>
            </div>
          </div>
        )}
      </BottomSheetModal>

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, margin: 0 }}>รายการวันนี้ ({items.length})</h2>
            <DiscardDraftButton
              label="ยกเลิกทั้งหมด"
              confirmMessage="รายการที่บันทึกไว้วันนี้ทั้งหมด (ทุกหมวด) จะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ"
              onDiscard={discardDraft}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 100 }}>
            {items.map((item, index) => {
              const itemCategory = getCategory(item.category)
              return (
                <Card
                  key={item.rowId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `4px solid var(--color-${itemCategory?.tone || 'neutral'})`
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 14, color: `var(--color-${itemCategory?.tone || 'neutral'})`, fontWeight: 600 }}>
                      {itemCategory?.icon} {item.category}
                      {item.note ? <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> • {item.note}</span> : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <QtyStepper value={item.quantity} onChange={(qty) => updateItemQuantity(index, qty)} />
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
              )
            })}
          </div>

          <StickyActionBar>
            <Button onClick={handleSubmitAll} loading={submitting} loadingText="กำลังบันทึก...">
              ยืนยันรายการทั้งหมด ({items.length}) → พร้อมปริ้น
            </Button>
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
