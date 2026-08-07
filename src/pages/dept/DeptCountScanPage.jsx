import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { lookupProduct } from '../../services/productLookup'
import { fetchProductMasterEntries, toLookupMap } from '../../services/productMasterCache'
import { useCachedData } from '../../hooks/useCachedData'
import { parseScannedCode } from '../../utils/parseScannedCode'
import { deptCountDraftKey, hasSubmittedToday } from '../../services/deptCountService'
import { newTransactionId } from '../../utils/transactionId'
import QRScanner from '../../components/ui/QRScanner'
import NumericInput from '../../components/ui/NumericInput'
import QtyStepper from '../../components/ui/QtyStepper'
import DiscardDraftButton from '../../components/ui/DiscardDraftButton'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import RefreshMasterButton from '../../components/ui/RefreshMasterButton'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StickyActionBar from '../../components/layout/StickyActionBar'

const TITLE = { opening: 'นับเปิดร้าน', closing: 'นับปิดร้าน' }

export default function DeptCountScanPage() {
  const { type } = useParams() // 'opening' | 'closing'
  const { session } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()

  // กันเข้าผ่าน URL ตรงข้ามกฎ D1 (ต้องนับเปิดร้านก่อนถึงจะนับปิดร้านได้ + ห้ามนับซ้ำถ้าทำไปแล้ว)
  // เช็คเองที่นี่ด้วย ไม่พึ่งแค่ปุ่ม disabled ในหน้า Home เพราะ URL ตรงข้ามหน้านั้นได้เสมอ
  const [guardChecked, setGuardChecked] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function checkGuard() {
      try {
        const alreadyDone = await hasSubmittedToday(type, session.branchCode)
        if (cancelled) return
        if (alreadyDone) {
          show(`วันนี้ทำ "${TITLE[type]}" ไปแล้ว`, { type: 'info' })
          navigate('/dept/count', { replace: true })
          return
        }
        if (type === 'closing') {
          const openingDone = await hasSubmittedToday('opening', session.branchCode)
          if (cancelled) return
          if (!openingDone) {
            show('ต้องนับเปิดร้านให้เสร็จก่อนถึงจะนับปิดร้านได้', { type: 'error' })
            navigate('/dept/count', { replace: true })
            return
          }
        }
        if (!cancelled) setGuardChecked(true)
      } catch (err) {
        if (!cancelled) {
          show(err.message || 'ตรวจสอบสถานะไม่สำเร็จ', { type: 'error' })
          navigate('/dept/count', { replace: true })
        }
      }
    }
    checkGuard()
    return () => {
      cancelled = true
    }
  }, [type, session.branchCode])

  const draftKey = deptCountDraftKey(type, session.branchCode)
  const { data: items, save, hasRestorableDraft, draftPreview, restoreDraft, discardDraft } =
    useDraftAutosave(draftKey, [])

  // แคชรายการสินค้าทั้งชุดไว้ในเครื่อง lookup ทันทีไม่ต้องรอ network ทุกครั้งที่สแกน (แก้ปัญหาช้า)
  const masterCacheKey = `productMaster:${session.branchType}:${session.branchCode}`
  const { data: masterEntries, refreshing: masterRefreshing, refresh: refreshMaster } = useCachedData(masterCacheKey, () =>
    fetchProductMasterEntries(session.branchType, session.branchCode)
  )
  const masterMap = toLookupMap(masterEntries)

  const [pendingItem, setPendingItem] = useState(null)
  const [manualName, setManualName] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [quantity, setQuantity] = useState(0)
  const [looking, setLooking] = useState(false)
  const [duplicateOf, setDuplicateOf] = useState(null)

  if (!guardChecked) {
    return (
      <div>
        <PageHeader title={TITLE[type] || 'นับสต๊อก'} />
        <p>กำลังตรวจสอบสถานะ...</p>
      </div>
    )
  }

  const handleDetected = async (raw) => {
    if (looking) return
    setNotFound(false)
    const { sku } = parseScannedCode(raw)
    if (!sku) {
      show('อ่านรหัสไม่ได้ กรุณาลองสแกนใหม่หรือกรอกรหัสมือ', { type: 'error' })
      return
    }

    // เช็คแคชในเครื่องก่อนเสมอ (เร็วระดับ millisecond ไม่ต้องรอ network) — แก้ปัญหาช้า 5-7 วิ/SKU
    const cached = masterMap.get(sku)
    if (cached) {
      setPendingItem(cached)
      setQuantity(0)
      return
    }

    // ไม่เจอในแคช -> อาจเป็น SKU ใหม่ที่เพิ่งเพิ่มหลัง cache โหลดไป เช็คซ้ำกับ Sheet สดอีกที
    setLooking(true)
    try {
      const product = await lookupProduct(sku, { branchType: session.branchType, branchCode: session.branchCode })
      if (product) {
        setPendingItem(product)
        setQuantity(0)
      } else {
        setPendingItem({ sku, name: '', unit: '' })
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
    setPendingItem(null)
    setNotFound(false)
    setManualName('')
    setQuantity(0)
  }

  const addToDraft = (replaceIndex = null) => {
    const name = notFound ? manualName.trim() : pendingItem.name
    if (!name) {
      show('กรุณากรอกชื่อสินค้า', { type: 'error' })
      return
    }
    const newItem = {
      rowId: replaceIndex !== null ? items[replaceIndex].rowId : newTransactionId('row'),
      sku: pendingItem.sku,
      name,
      unit: pendingItem.unit || '',
      quantity
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
    next[index] = { ...next[index], quantity: qty }
    save(next)
  }

  return (
    <div>
      <PageHeader
        title={TITLE[type] || 'นับสต๊อก'}
        subtitle={`นับไปแล้ว ${items.length} SKU`}
        right={<RefreshMasterButton refreshing={masterRefreshing} onRefresh={refreshMaster} />}
      />

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
        message={duplicateOf !== null ? `${items[duplicateOf]?.name} นับไปแล้ว = ${items[duplicateOf]?.quantity} — รวมจำนวน หรือแก้ไขค่าเดิม?` : ''}
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

      {!pendingItem && (
        <Card style={{ marginBottom: 20 }}>
          <QRScanner onDetected={handleDetected} disabled={looking} />
        </Card>
      )}

      {pendingItem && (
        <Card style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {notFound && (
            <div style={{ background: 'var(--color-warning-bg)', color: '#7A5B00', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 15 }}>
              ⚠️ ไม่พบรหัส "{pendingItem.sku}" ในระบบ กรุณากรอกชื่อสินค้าเอง
            </div>
          )}
          <div>
            <div style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>รหัสสินค้า</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{pendingItem.sku}</div>
          </div>
          {notFound ? (
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>ชื่อสินค้า</label>
              <input style={inputStyle} value={manualName} onChange={(e) => setManualName(e.target.value)} autoFocus />
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>ชื่อสินค้า</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{pendingItem.name}</div>
            </div>
          )}

          <NumericInput label="จำนวนที่นับได้" value={quantity} onChange={setQuantity} unit={pendingItem.unit} />

          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={resetEntry}>ยกเลิก</Button>
            <Button onClick={handleConfirmAdd}>บันทึก</Button>
          </div>
        </Card>
      )}

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, margin: 0 }}>รายการที่นับแล้ว ({items.length})</h2>
            <DiscardDraftButton
              label={`ยกเลิก${TITLE[type] || 'การนับ'}ทั้งหมด`}
              confirmMessage="รายการที่นับไว้ทั้งหมดในรอบนี้จะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ"
              onDiscard={discardDraft}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 110 }}>
            {items.map((item, index) => (
              <Card key={item.rowId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{item.sku}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <QtyStepper value={item.quantity} onChange={(qty) => updateQty(index, qty)} />
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
            <Button onClick={() => navigate(`/dept/count/summary/${type}`)}>ไปหน้าสรุปก่อนยืนยัน ({items.length})</Button>
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
