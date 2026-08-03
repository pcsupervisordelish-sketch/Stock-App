import StickyActionBar from '../../components/layout/StickyActionBar'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { getCategory, getNoteHistory, saveNoteToHistory } from '../../config/returnCategories'
import { lookupProduct, confirmDraftBatch } from '../../services/returnsService'
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

  const handleDetected = async (code) => {
    if (looking) return
    setLooking(true)
    setNotFound(false)
    setPendingProduct(null)
    try {
      const product = await lookupProduct(code, { branchType: session.branchType, branchCode: session.branchCode })
      if (product) {
        setPendingProduct(product)
        setQuantity(1)
        setNote('')
      } else {
        setPendingProduct({ sku: code, name: '', unit: '' })
        setManualName('')
        setNotFound(true)
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
      <PageHeader title={`${category.icon} ${category.label}`} subtitle={category.description} />

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

      {!pendingProduct && (
        <Card style={{ marginBottom: 20 }}>
          <QRScanner onDetected={handleDetected} disabled={looking} />
          {looking && <p style={{ marginTop: 10, color: 'var(--color-text-muted)' }}>กำลังค้นหาสินค้า...</p>}
        </Card>
      )}

      {pendingProduct && (
        <Card style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {notFound && (
            <div style={{ background: 'var(--color-warning-bg)', color: '#7A5B00', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 15 }}>
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
        </Card>
      )}

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
            {items.map((item, index) => (
              <Card key={item.rowId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                    {getCategory(item.category)?.icon} {item.category}
                    {item.note ? ` • ${item.note}` : ''}
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
            ))}
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
