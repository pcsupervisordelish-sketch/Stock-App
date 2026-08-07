// คำนวณ path "ย้อนกลับ" ของแต่ละหน้า ใช้กับปุ่มย้อนกลับใน TopBar
// ใช้ mapping ตายตัวแทนการพึ่ง browser history (navigate(-1)) เพราะถ้าเข้าหน้าผ่าน deep link
// ตรงๆ หรือ refresh มา history อาจว่าง/ไม่แน่นอน ทำให้ปุ่มย้อนกลับพาไปที่ไม่คาดคิดได้
const BACK_RULES = [
  [/^\/stock-count\/summary$/, () => '/stock-count/scan'],
  [/^\/stock-count\/missing$/, () => '/stock-count/report'],
  [/^\/stock-count\/(import|scan|report|history)$/, () => '/stock-count'],
  [/^\/stock-count$/, () => '/home'],

  [/^\/receiving\/summary$/, () => '/receiving'],
  [/^\/receiving$/, () => '/home'],

  [/^\/returns\/scan\/([^/]+)$/, (m) => {
    // "เสียคัดออก"/"เสียทำลายหน้าร้าน" มาจากหน้าย่อย /returns/spoil ต้องย้อนกลับไปที่นั่น
    // ไม่ใช่ /returns ตรงๆ ไม่งั้นผู้ใช้ต้องกดเข้า "เสีย" ซ้ำสองรอบถ้าเลือกผิดหมวด
    const value = decodeURIComponent(m[1])
    return value === 'เสียคัดออก' || value === 'เสียทำลายหน้าร้าน' ? '/returns/spoil' : '/returns'
  }],
  [/^\/returns\/spoil$/, () => '/returns'],
  [/^\/returns\/(pending|history)$/, () => '/returns'],
  [/^\/returns$/, () => '/home'],

  [/^\/dept\/count\/summary\/([^/]+)$/, (m) => `/dept/count/scan/${m[1]}`],
  [/^\/dept\/count\/scan\/[^/]+$/, () => '/dept/count'],
  [/^\/dept\/count$/, () => '/home'],
  [/^\/dept\/closing\/[^/]+$/, () => '/dept/closing'],
  [/^\/dept\/closing$/, () => '/home'],
  [/^\/dept\/stock$/, () => '/home'],

  [/^\/dept\/orders\/history$/, () => '/dept/orders'],
  [/^\/dept\/orders\/([^/]+)\/cart$/, (m) => `/dept/orders/${m[1]}/select`],
  [/^\/dept\/orders\/([^/]+)\/select$/, (m) => `/dept/orders/${m[1]}/date`],
  [/^\/dept\/orders\/([^/]+)\/date$/, () => '/dept/orders'],
  [/^\/dept\/orders$/, () => '/home'],

  [/^\/print-export\/receiving\/[^/]+$/, () => '/print-export/receiving'],
  [/^\/print-export\/receiving$/, () => '/print-export'],
  [/^\/print-export\/returns$/, () => '/print-export'],
  [/^\/print-export\/dept-closing\/[^/]+$/, () => '/print-export/dept-closing'],
  [/^\/print-export\/dept-closing$/, () => '/print-export'],
  [/^\/print-export\/company-count\/[^/]+$/, () => '/print-export/company-count'],
  [/^\/print-export\/company-count$/, () => '/print-export'],
  [/^\/print-export$/, () => '/home'],

  [/^\/home$/, () => null]
]

export function getBackTarget(pathname) {
  for (const [pattern, resolve] of BACK_RULES) {
    const match = pathname.match(pattern)
    if (match) return resolve(match)
  }
  return '/home' // path ที่ไม่รู้จัก (ไม่ควรเกิด) — กลับหน้าแรกไว้ก่อนเพื่อความปลอดภัย
}
