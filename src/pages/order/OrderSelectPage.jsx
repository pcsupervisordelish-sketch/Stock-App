import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../../components/ui/QRScanner.css'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useDraftAutosave } from '../../hooks/useDraftAutosave'
import { orderDraftKey, readOrderDraft, fetchProductMaster } from '../../services/orderService'
import { newTransactionId } from '../../utils/transactionId'
import QRScanner from '../../components/ui/QRScanner'
import NumericInput from '../../components/ui/NumericInput'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StickyActionBar from '../../components/layout/StickyActionBar'

const AREA_LABEL = { booth: 'บูธ', fridge: 'ตู้แช่' }
const OTHER_AREA = { booth: 'fridge', fridge: 'booth' }

export default function OrderSelectPage() {
  const { area } = useParams()
  const { session } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()

  const draftKey = orderDraftKey(area, session.branchCode)
  const { data, save } = useDraftAutosave(draftKey, { deliveryDate: null, items: [] })

  useEffect(() => {
    // กันเข้าผ่าน URL ตรงข้าม E0 — ถ้าอีกพื้นที่มีตะกร้าค้างอยู่ (และพื้นที่นี้ยังไม่มีวันที่ตั้งไว้จริง) ห้ามเริ่ม
    const otherArea = OTHER_AREA[area]
    if (!data.deliveryDate && otherArea && readOrderDraft(otherArea, session.branchCode)) {
      navigate('/dept/orders', { replace: true })
      return
    }
    if (!data.deliveryDate) navigate(`/dept/orders/${area}/date`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [master, setMaster] = useState(null)
  const [masterError, setMasterError] = useState(null)
  const [method, setMethod] = useState('browse')
  const [search, setSearch] = useState('')

  const [pendingItem, setPendingItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [duplicateOf, setDuplicateOf] = useState(null)

  useEffect(() => {
    fetchProductMaster(area).then(setMaster).catch((err) => setMasterError(err.message))
  }, [area])

  const grouped = useMemo(() => {
    if (!master) return []
    const map = new Map()
    master.forEach((p) => {
      const g = p.group || 'ไม่ระบุกลุ่ม'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(p)
    })
    return Array.from(map.entries())
  }, [master])

  const searchResults = useMemo(() => {
    if (!master || !search.trim()) return []
    const q = search.trim().toLowerCase()
    return master.filter((p) => p.nameThai?.toLowerCase().includes(q) || p.nameEng?.toLowerCase().includes(q) || p.sku?.includes(search.trim()))
  }, [master, search])

  const handleDetected = (code) => {
    const product = master?.find((p) => p.sku === code.trim())
    if (product) {
      openQtyEntry(product)
    } else {
      show('ไม่พบรหัสนี้ในรายการสินค้า กรุณาแจ้งผู้ดูแลให้เพิ่มใน Sheet ก่อน', { type: 'error' })
    }
  }

  const openQtyEntry = (product) => {
    setPendingItem(product)
    const existing = data.items.find((it) => it.sku === product.sku)
    setQuantity(existing ? existing.quantity : 1)
  }

  const addToCart = (replace = false) => {
    const existingIndex = data.items.findIndex((it) => it.sku === pendingItem.sku)
    if (existingIndex !== -1 && !replace && duplicateOf === null) {
      setDuplicateOf(existingIndex)
      return
    }
    const newItem = {
      rowId: existingIndex !== -1 ? data.items[existingIndex].rowId : newTransactionId('row'),
      ...pendingItem,
      quantity
    }
    const nextItems = [...data.items]
    if (existingIndex !== -1) nextItems[existingIndex] = newItem
    else nextItems.push(newItem)
    save({ ...data, items: nextItems })
    show(`เพิ่ม "${pendingItem.nameThai}" ลงตะกร้าแล้ว`, { type: 'success' })
    setPendingItem(null)
    setDuplicateOf(null)
  }

  return (
    <div>
      <PageHeader
        title={`เลือกสินค้า — ${AREA_LABEL[area] || area}`}
        subtitle={`รับ/ส่ง ${data.deliveryDate || ''} • ตะกร้ามี ${data.items.length} รายการ`}
      />

      {masterError && <Card style={{ marginBottom: 16 }}><p style={{ color: 'var(--color-danger)', margin: 0 }}>โหลดรายการสินค้าไม่สำเร็จ: {masterError}</p></Card>}

      <ConfirmDialog
        open={duplicateOf !== null}
        title="สินค้านี้อยู่ในตะกร้าแล้ว"
        message={duplicateOf !== null ? `${data.items[duplicateOf]?.nameThai} มีอยู่แล้วจำนวน ${data.items[duplicateOf]?.quantity} — รวมจำนวน หรือแก้ไขค่าเดิม?` : ''}
        confirmLabel="แก้ไขค่าเดิม (แทนที่)"
        cancelLabel="รวมจำนวน"
        onConfirm={() => addToCart(true)}
        onCancel={() => {
          const idx = duplicateOf
          const nextItems = [...data.items]
          nextItems[idx] = { ...nextItems[idx], quantity: Number(nextItems[idx].quantity) + Number(quantity) }
          save({ ...data, items: nextItems })
          show('รวมจำนวนแล้ว', { type: 'success' })
          setPendingItem(null)
          setDuplicateOf(null)
        }}
      />

      {pendingItem ? (
        <Card style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>{pendingItem.sku}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{pendingItem.nameThai}</div>
            {pendingItem.nameEng && <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{pendingItem.nameEng}</div>}
          </div>
          <NumericInput label="จำนวนที่จะสั่ง" value={quantity} onChange={setQuantity} unit={pendingItem.unit} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={() => setPendingItem(null)}>ยกเลิก</Button>
            <Button onClick={() => addToCart(false)}>เพิ่มลงตะกร้า</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="qrscanner__tabs">
            <button type="button" className={`qrscanner__tab ${method === 'browse' ? 'is-active' : ''}`} onClick={() => setMethod('browse')}>
              📋 เลือกจากลิสต์
            </button>
            <button type="button" className={`qrscanner__tab ${method === 'search' ? 'is-active' : ''}`} onClick={() => setMethod('search')}>
              🔍 ค้นหา
            </button>
            <button type="button" className={`qrscanner__tab ${method === 'scan' ? 'is-active' : ''}`} onClick={() => setMethod('scan')}>
              📷 สแกน
            </button>
          </div>

          {method === 'scan' && (
            <Card style={{ marginBottom: 100 }}>
              <QRScanner onDetected={handleDetected} disabled={!master} />
            </Card>
          )}

          {method === 'search' && (
            <div style={{ marginBottom: 100 }}>
              <input
                placeholder="พิมพ์ชื่อสินค้า (ไทย/อังกฤษ) หรือรหัส"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', minHeight: 52, fontSize: 18, padding: '0 14px', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', marginBottom: 14 }}
                autoFocus
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map((p) => (
                  <ProductRow key={p.sku} product={p} onClick={() => openQtyEntry(p)} inCartQty={data.items.find((it) => it.sku === p.sku)?.quantity} />
                ))}
              </div>
            </div>
          )}

          {method === 'browse' && (
            <div style={{ marginBottom: 100 }}>
              {!master && !masterError && <p>กำลังโหลดรายการสินค้า...</p>}
              {grouped.map(([groupName, products]) => (
                <details key={groupName} open style={{ marginBottom: 12 }}>
                  <summary style={{ fontSize: 16, fontWeight: 700, cursor: 'pointer', padding: '8px 0' }}>{groupName} ({products.length})</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {products.map((p) => (
                      <ProductRow key={p.sku} product={p} onClick={() => openQtyEntry(p)} inCartQty={data.items.find((it) => it.sku === p.sku)?.quantity} />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </>
      )}

      <StickyActionBar>
        <Button onClick={() => navigate(`/dept/orders/${area}/cart`)} disabled={data.items.length === 0}>
          ไปตะกร้า ({data.items.length})
        </Button>
      </StickyActionBar>
    </div>
  )
}

function ProductRow({ product, onClick, inCartQty }) {
  return (
    <Card onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
      <div>
        <div style={{ fontWeight: 700 }}>{product.nameThai}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{product.sku} • {product.price ? `${product.price} บาท` : ''}</div>
      </div>
      {inCartQty && <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>ในตะกร้า: {inCartQty}</span>}
    </Card>
  )
}
