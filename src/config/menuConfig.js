// เมนูหลักหลัง Login — ตรงตามหมวด "เมนูหลักหลัง Login" ในเอกสาร prompt
// path ต้องตรงกับที่ประกาศไว้ใน src/App.jsx

export const MENU_COMPANY = [
  { path: '/stock-count', icon: '📦', label: 'นับสต๊อก (เทียบ SAP)' },
  { path: '/receiving', icon: '📥', label: 'รับสินค้าเข้า' },
  { path: '/returns', icon: '📤', label: 'บันทึก/ตีคืนสินค้า' },
  { path: '/print-export', icon: '🖨️', label: 'ปริ้น/Export' }
]

export const MENU_MALL = [
  { path: '/dept/count', icon: '🔄', label: 'สแกน/นับสต๊อก (เปิด-ปิดร้าน)' },
  { path: '/receiving', icon: '📥', label: 'รับสินค้าเข้า' },
  { path: '/returns', icon: '📤', label: 'บันทึก/ตีคืนสินค้า' },
  { path: '/dept/orders', icon: '🛒', label: 'สั่งสินค้า' },
  { path: '/dept/closing', icon: '📊', label: 'สรุปสิ้นวัน' },
  { path: '/print-export', icon: '🖨️', label: 'ปริ้น/Export' }
]

export function getMenuForBranchType(branchType) {
  return branchType === 'ห้าง' ? MENU_MALL : MENU_COMPANY
}
