import { readSheet, writeBatch } from './sheetsService'
import { todayKey, nowTimeLabel } from '../utils/dateUtils'
import { newTransactionId } from '../utils/transactionId'
import { gpsColumns } from '../utils/gpsUtils'

const MASTER_TAB = { booth: 'ProductMasterBooth', fridge: 'ProductMasterFridge' }
const ORDER_TAB = { booth: 'OrderBooth', fridge: 'OrderFridge' }

export function orderDraftKey(area, branchCode) {
  return `order:${area}:${branchCode}`
}

// E0: เช็ค draft ตะกร้าค้างของพื้นที่ที่ระบุ (อ่าน localStorage ตรงๆ ไม่ผ่าน hook เพราะแค่เช็คสถานะ)
export function readOrderDraft(area, branchCode) {
  try {
    const raw = localStorage.getItem(`draft:${orderDraftKey(area, branchCode)}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.items?.length > 0 ? parsed : null
  } catch {
    return null
  }
}

// E5: ดึง Master สินค้าของพื้นที่นั้นแบบ dynamic ทุกครั้งที่เปิดหน้า (ไม่ cache ถาวร)
export async function fetchProductMaster(area) {
  const rows = await readSheet(MASTER_TAB[area])
  return rows.map((r) => ({
    sku: r['รหัส'],
    nameThai: r['ชื่อไทย'],
    nameEng: r['ชื่ออังกฤษ'],
    weight: r['น้ำหนัก'],
    unit: r['หน่วย'],
    price: r['ราคา'],
    group: r['กลุ่ม']
  }))
}

// E4: ยืนยันส่งข้อมูล — เขียนเข้า OrderBooth/OrderFridge (1 แถวต่อ SKU)
// items: [{ sku, nameThai, nameEng, weight, unit, price, group, quantity }]
export async function submitOrder(area, items, deliveryDate, { session, gps }) {
  const rows = items.map((item) => ({
    วันที่สั่ง: todayKey(),
    เวลา: nowTimeLabel(),
    พนักงาน: session.employeeName,
    'วันที่รับ/ส่งสินค้า': deliveryDate,
    สาขา: session.branchCode,
    รหัส: item.sku,
    ชื่อไทย: item.nameThai,
    ชื่ออังกฤษ: item.nameEng || '',
    กลุ่ม: item.group || '',
    น้ำหนัก: item.weight || '',
    ราคา: item.price || '',
    จำนวนสั่ง: item.quantity,
    ...gpsColumns(gps),
    rowId: newTransactionId('row')
  }))
  return writeBatch(ORDER_TAB[area], rows, { transactionId: newTransactionId('order') })
}

// E6: ประวัติการสั่งย้อนหลัง — รวมทั้ง 2 พื้นที่ เฉพาะของสาขาตัวเอง จัดกลุ่มเป็นรอบคำสั่งซื้อ
export async function fetchOrderHistory(branchCode) {
  const [boothRows, fridgeRows] = await Promise.all([
    readSheet(ORDER_TAB.booth, { สาขา: branchCode }),
    readSheet(ORDER_TAB.fridge, { สาขา: branchCode })
  ])
  const tagged = [
    ...boothRows.map((r) => ({ ...r, __area: 'booth' })),
    ...fridgeRows.map((r) => ({ ...r, __area: 'fridge' }))
  ]

  const byRound = new Map()
  tagged.forEach((r) => {
    const key = `${r['วันที่สั่ง']}_${r['เวลา']}_${r.__area}`
    if (!byRound.has(key)) {
      byRound.set(key, {
        key,
        area: r.__area,
        orderDate: r['วันที่สั่ง'],
        orderTime: r['เวลา'],
        deliveryDate: r['วันที่รับ/ส่งสินค้า'],
        employee: r['พนักงาน'],
        rows: []
      })
    }
    byRound.get(key).rows.push(r)
  })

  return Array.from(byRound.values()).sort((a, b) => (a.orderDate + a.orderTime < b.orderDate + b.orderTime ? 1 : -1))
}
