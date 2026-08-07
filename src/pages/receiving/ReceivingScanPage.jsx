import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { lookupProduct } from '../../services/productLookup'
import { fetchProductMasterEntries, toLookupMap } from '../../services/productMasterCache'
import { useCachedData } from '../../hooks/useCachedData'
import { parseScannedCode } from '../../utils/parseScannedCode'
import { todayKey } from '../../utils/dateUtils'
import { newTransactionId } from '../../utils/transactionId'
import QRScanner from '../../components/ui/QRScanner'
import NumericInput from '../../components/ui/NumericInput'
import QtyStepper from '../../components/ui/QtyStepper'
import DiscardDraftButton from '../../components/ui/DiscardDraftButton'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import RefreshMasterButton from '../../components/ui/RefreshMasterButton'
import PageHeader from '../../components/layout/PageHeader'
import StickyActionBar from '../../components/layout/StickyActionBar'

export function receivingDraftKey(branchCode) {
  return `receiving:${branchCode}:${todayKey()}`
}

export default function ReceivingScanPage() {
  const { session } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()

  const draftKey = receivingDraftKey(session.branchCode)
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
  const [receivedQty, setReceivedQty] = useState(0)
  const [noteQty, setNoteQty] = useState(0)
  const [looking, setLooking] = useState(false)

  const handleDetected = async (raw) => {
    if (looking) return
    setNotFound(false)
    const { sku } = parseScannedCode(raw)
    if (!sku) {
      show('อ่านรหัสไม่ได้ กรุณาลองสแกนใหม่หรือกรอกรหัสมือ', { type: 'error' })
      return
    }

    // ถ้า SKU นี้มีอยู่แล้วในรอบเดียวกัน (ยังไม่ submit) -> ขึ้นจำนวนเดิมให้แก้ไขต่อได้ทันที
    const existing = items.find((it) => it.sku === sku)
    if (existing) {
      setPendingItem({ sku: existing.sku, name: existing.name, unit: existing.unit })
      setReceivedQty(existing.receivedQty)
      setNoteQty(existing.noteQty)
      return
    }

    // เช็คแคชในเครื่องก่อนเสมอ (เร็วระดับ millisecond ไม่ต้องรอ network) — แก้ปัญหาช้า 5-7 วิ/SKU
    const cached = masterMap.get(sku)
    if (cached) {
      setPendingItem(cached)
      setReceivedQty(0)
      setNoteQty(0)
      return
    }

    // ไม่เจอในแคช -> อาจเป็น SKU ใหม่ที่เพิ่งเพิ่มหลัง cache โหลดไป เช็คซ้ำกับ Sheet สดอีกที
    setLooking(true)
    try {
      const product = await lookupProduct(sku, { branchType: session.branchType, branchCode: session.branchCode })
      if (product) {
        setPendingItem(product)
        setReceivedQty(0)
        setNoteQty(0)
      } else {
        setPendingItem({ sku, name: '', unit: '' })
        setManualName('')
        setNotFound(true)
        setReceivedQty(0)
        setNoteQty(0)
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
    setReceivedQty(0)
    setNoteQty(0)
  }

  const handleSaveItem = () => {
    const name = notFound ? manualName.trim() : pendingItem.name
    if (!name) {
      show('กรุณากรอกชื่อสินค้า', { type: 'error' })
      return
    }
    const existingIndex = items.findIndex((it) => it.sku === pendingItem.sku)
    const newItem = {
      rowId: existingIndex !== -1 ? items[existingIndex].rowId : newTransactionId('row'),
      sku: pendingItem.sku,
      name,
      unit: pendingItem.unit || '',
      receivedQty,
      noteQty
    }
    if (existingIndex !== -1) {
      const next = [...items]
      next[existingIndex] = newItem
      save(next)
    } else {
      save([...items, newItem])
    }
    show(`บันทึก "${name}" แล้ว`, { type: 'success' })
    resetEntry()
  }

  const removeItem = (index) => save(items.filter((_, i) => i !== index))
  const updateItemField = (index, field, value) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: value }
    save(next)
  }

  return (
    <div>
      <PageHeader
        title="รับสินค้าเข้า"
        subtitle="กรอกจำนวนจริงที่รับ และจำนวนตามใบส่งของ (ไม่บังคับลำดับ)"
        right={<RefreshMasterButton refreshing={masterRefreshing} onRefresh={refreshMaster} />}
      />

      {hasRestorableDraft && (
        <Card style={{ marginBottom: 16, background: 'var(--color-warning-bg)' }}>
          <p style={{ margin: 0 }}>พบข้อมูลค้างจากครั้งก่อน ({draftPreview?.length || 0} SKU)</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button variant="secondary" onClick={discardDraft}>เริ่มใหม่</Button>
            <Button onClick={restoreDraft}>ทำต่อจากเดิม</Button>
          </div>
        </Card>
      )}

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

          <NumericInput label="จำนวนที่รับจริง (นับหน้างาน)" value={receivedQty} onChange={setReceivedQty} unit={pendingItem.unit} />
          <NumericInput label="จำนวนตามใบส่งของ" value={noteQty} onChange={setNoteQty} unit={pendingItem.unit} />

          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={resetEntry}>ยกเลิก</Button>
            <Button onClick={handleSaveItem}>บันทึกรายการนี้</Button>
          </div>
        </Card>
      )}

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, margin: 0 }}>รายการที่บันทึกแล้ว ({items.length})</h2>
            <DiscardDraftButton
              label="ยกเลิกทั้งหมด"
              confirmMessage="รายการรับเข้าที่บันทึกไว้ทั้งหมดในรอบนี้จะถูกลบทิ้ง ยังไม่มีข้อมูลใดถูกส่งเข้าระบบ"
              onDiscard={discardDraft}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 110 }}>
            {items.map((item, index) => {
              const diff = Number(item.receivedQty) - Number(item.noteQty)
              return (
                <Card key={item.rowId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {item.sku}
                        {diff !== 0 && (
                          <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}> • ต่าง {diff > 0 ? `+${diff}` : diff}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label="ลบรายการ"
                      style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 22, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>จำนวนตามใบส่งของ</div>
                      <QtyStepper value={item.noteQty} onChange={(qty) => updateItemField(index, 'noteQty', qty)} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>จำนวนจริงที่รับ</div>
                      <QtyStepper value={item.receivedQty} onChange={(qty) => updateItemField(index, 'receivedQty', qty)} />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <StickyActionBar>
            <Button onClick={() => navigate('/receiving/summary')}>ไปหน้าสรุปผลรับเข้า ({items.length})</Button>
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
