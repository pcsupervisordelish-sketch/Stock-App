# ระบบจัดการสต๊อกหน้าร้าน (Stock Reconciliation & Return System)

เว็บแอป React สำหรับนับสต๊อก รับสินค้าเข้า บันทึก/ตีคืนสินค้า และกระทบยอดขายหน้าร้าน
ใช้ Google Sheets เป็นฐานข้อมูลกลาง ผ่าน Google Apps Script Web App (ไม่ต้องมี server แยก)

อ้างอิงสเปกเต็มจากไฟล์ prompt ต้นทาง — ตอนนี้**เสร็จครบทุกโมดูลแล้ว**: หน้า Login, เมนูหลัก,
shared components, service layer, backend เชื่อมต่อ Google Sheets, **โมดูล A (นับสต๊อกเทียบ
SAP ครบ A1-A7)**, **โมดูล B (รับสินค้าเข้า ครบ B1-B2)**, **โมดูล C (บันทึก/ตีคืนสินค้า ครบ
C0-C5)**, **โมดูล D (สาขาห้าง ครบ D1-D7)**, **โมดูล E (สั่งสินค้า ครบ E0-E6)**, และ**โมดูล F
(ปริ้น/Export รวมศูนย์ ครบ F0-F5)**

> ขั้นถัดไปที่แนะนำก่อนใช้งานจริง: ทดสอบ end-to-end กับ Google Sheet จริง (ตั้งตาม
> `apps-script/README.md`), ทดสอบบนอุปกรณ์จริงทั้ง 2 แบบ (จอเล็ก/จอใหญ่) ตามที่สเปกกำชับไว้ในหมวด
> "ข้อกำชับเรื่องคุณภาพโดยรวม" และทดสอบ concurrency จริงกับอุปกรณ์หลายเครื่องพร้อมกัน

### หมายเหตุการปริ้น/Export (โมดูล F)
- ปุ่ม "ปริ้น" ใช้ `window.print()` ของเบราว์เซอร์ตรงๆ + CSS `@media print` ซ่อน
  sidebar/bottom nav ให้เหลือแค่เอกสารในกรอบ `.print-area`
- ปุ่ม "บันทึกรูปภาพ/แชร์" ใช้ `html2canvas` แปลง DOM เป็นรูป แล้วใช้ Web Share API
  (`navigator.share`) ถ้าเบราว์เซอร์ไม่รองรับจะดาวน์โหลดไฟล์ภาพให้แทนอัตโนมัติ
- ประวัติ "ปริ้น/แชร์ล่าสุด" และเลขเวอร์ชันเอกสาร เก็บที่ `localStorage` ของเครื่องนั้นเท่านั้น
  (ไม่ sync ข้ามเครื่อง) — ถ้าปริ้นจากเครื่องอื่นจะไม่เห็นประวัติของเครื่องนี้ ยอมรับได้เพราะ
  ปกติปริ้นจากเครื่องเดียวที่หน้าร้าน แต่ถ้าต้องการติดตามข้ามเครื่องจริงจัง ควรเพิ่ม Tab
  "PrintLog" ใน Sheet แล้วปรับ `usePrintVersion` ให้อ่าน/เขียนผ่าน backend แทนในอนาคต

## เริ่มต้นใช้งาน (dev)

```bash
npm install
cp .env.example .env      # แล้วใส่ VITE_APPS_SCRIPT_URL ของจริง (ดู apps-script/README.md)
npm run dev
```

เปิด `http://localhost:5173`

> **ถ้ายังไม่ได้ตั้งค่า Apps Script**: หน้า Login จะขึ้น error ตอนโหลดรายชื่อสาขา (เพราะยังไม่มี
> backend ให้เรียก) เป็นเรื่องปกติ — ให้ทำตาม `apps-script/README.md` ก่อน

## Build สำหรับใช้งานจริง

```bash
npm run build     # ได้ไฟล์ static ในโฟลเดอร์ dist/
npm run preview   # ลองรันไฟล์ build ก่อน deploy จริง
```

นำโฟลเดอร์ `dist/` ไป deploy ที่ static hosting ใดก็ได้ (Vercel, Netlify, Firebase Hosting,
GitHub Pages ฯลฯ) — เป็นไฟล์ static ล้วนๆ ไม่ต้องมี Node server ฝั่ง production

## โครงสร้างโปรเจกต์

```
src/
  components/
    ui/          shared components (Button, NumericInput, QRScanner, ฯลฯ)
    layout/      Sidebar / BottomNav / AppLayout (responsive ตาม H4)
  context/       AuthContext (session/login), ToastContext (แจ้งเตือน)
  hooks/         useDraftAutosave, useInstanceLock, useGeolocation, useOnlineStatus
  services/      sheetsService.js — จุดเดียวที่คุยกับ Apps Script Web App
  pages/         หน้าแต่ละโมดูล (ครบทุกโมดูล A-F แล้ว)
  config/        menuConfig.js — เมนูตามประเภทสาขา
  utils/         transactionId.js, dateUtils.js
apps-script/     โค้ด Google Apps Script (backend) + วิธีติดตั้ง
```

## ติดตั้งเป็น PWA (สำหรับพนักงานหน้าร้าน)

1. Deploy เว็บขึ้น hosting จริงแล้ว (ต้องเป็น HTTPS, PWA ใช้ HTTP ธรรมดาไม่ได้)
2. เปิดเว็บผ่าน Chrome บน Sunmi V3 / มือถือ / คอมร้าน
3. กดเมนู "เพิ่มลงหน้าจอโฮม" (Android) หรือ "Install app" (คอม) จาก browser
4. เปิดจากไอคอนที่ติดตั้งแล้ว จะเป็นหน้าต่าง standalone ไม่มีแถบ URL ตามสเปก

## UI/UX เพิ่มเติมที่ทำไว้แล้ว
- **ปุ่ม "ยกเลิกทั้งหมด"**: ทุกหน้าสแกน/สรุปของโมดูล A (นับสต๊อก), B (รับเข้า), C (ตีคืน),
  D1 (นับเปิด/ปิดร้าน), E (ตะกร้าสั่งสินค้า) มีปุ่มล้าง draft ที่ยังไม่ยืนยันส่งข้อมูลทั้งหมด
  ได้ทันทีระหว่างทำงาน (ไม่ต้องออกจากหน้าไปก่อน) — ปลอดภัย เพราะล้างแค่ข้อมูลที่ยังไม่เข้า Sheet
  (component: `components/ui/DiscardDraftButton.jsx`)
- **ปุ่ม +/− แก้จำนวน**: ทุกจุดที่แก้จำนวนได้ในลิสต์ (หลังเพิ่มรายการแล้ว) ใช้ปุ่ม +/− ขนาด 40px
  แทน native number input spinner ที่กดยากบนมือถือ/สำหรับผู้สูงอายุ
  (component: `components/ui/QtyStepper.jsx` — คนละตัวกับ `NumericInput.jsx` ที่ใหญ่กว่า ใช้ตอน
  กรอกรายการใหม่ทีละตัว)

## การป้องกันบั๊กเพิ่มเติมที่ทำไว้แล้ว (ตามข้อกำชับคุณภาพในสเปก)
- **กันเขียนซ้ำตอน 2 เครื่องกดยืนยันพร้อมกัน**: ปฏิบัติการที่ต้อง "ครั้งเดียวต่อวันต่อสาขา"
  (นับเปิดร้าน/ปิดร้าน, นับสต๊อกสาขาบริษัท, ล็อกสรุปสิ้นวัน) มีการันตีฝั่ง backend แล้ว
  ไม่ได้เช็คแค่ฝั่ง UI — ถ้าอีกเครื่องกดไปก่อนแล้วภายใน lock เดียวกัน ระบบจะข้ามการเขียนซ้ำ
  ให้อัตโนมัติและแจ้งผู้ใช้ว่ามีคนทำไปก่อนแล้ว (ดู `onceOnlyFilters` ใน `sheetsService.js`)
- **กัน double-scan**: html5-qrcode ยิง callback ซ้ำได้หลายเฟรมถ้า QR เดิมยังอยู่ในกล้อง —
  `QRScanner.jsx` มี one-shot guard รับแค่ครั้งแรกต่อ session สแกนเท่านั้น
- **กันเข้าโมดูลผิดประเภทสาขา/ข้ามกฎ workflow ผ่าน URL ตรง**: `AppLayout.jsx` เช็ค branchType ก่อน
  render (บริษัทเข้า `/dept/*` หรือห้างเข้า `/stock-count` ไม่ได้แม้พิมพ์ URL ตรง) และแต่ละหน้าที่มี
  ลำดับ workflow บังคับ (เช่น D1 ต้องเปิดร้านก่อนปิดร้าน, A2 ต้อง import baseline ก่อน, E0 ห้ามเริ่ม
  พื้นที่ใหม่ถ้ามีตะกร้าค้าง) เช็คเงื่อนไขซ้ำที่ตัวหน้าเองด้วย ไม่พึ่งแค่ปุ่ม disabled ที่หน้าเมนู

### ข้อจำกัดที่ทราบอยู่แล้ว (ยอมรับได้ในเวอร์ชันนี้)
- ปฏิบัติการที่ไม่ใช่ "ครั้งเดียวต่อวัน" (บันทึกของเสีย, รับเข้า, สั่งสินค้า) ยังพึ่ง
  transactionId เป็นหลักในการกัน retry ซ้ำ — ถ้าเน็ตหลุดหลัง server เขียนสำเร็จแล้วแต่ก่อนที่
  client จะได้รับ response กลับมา แล้ว client retry ด้วย transactionId ใหม่ อาจเกิดแถวซ้อนได้
  (แก้ไขทีหลังได้ผ่านหน้าที่มีปุ่มแก้ไข/ลบ) ยอมรับความเสี่ยงนี้ไว้ก่อนเพราะเกิดยากและแก้ย้อนหลังได้

## Deploy บน GitHub Pages (แนะนำ — มี workflow อัตโนมัติให้แล้ว)

โปรเจกต์นี้มี GitHub Actions workflow (`.github/workflows/deploy.yml`) ที่ build และ deploy
ให้อัตโนมัติทุกครั้งที่ push เข้า branch `main` ทำตามขั้นตอนนี้ครั้งเดียว:

1. Push โค้ดทั้งหมดขึ้น GitHub repo (branch `main`)
2. ตั้งค่า Secret สำหรับ URL ของ Apps Script (**สำคัญมาก ถ้าลืมขั้นนี้ deploy จะได้แอปที่เชื่อม
   backend ไม่ได้**):
   - เข้า repo → **Settings → Secrets and variables → Actions → New repository secret**
   - ชื่อ: `VITE_APPS_SCRIPT_URL`
   - ค่า: URL ของ Apps Script Web App (จาก `apps-script/README.md` ขั้นที่ 3)
3. เปิดใช้ GitHub Pages ด้วย GitHub Actions:
   - เข้า repo → **Settings → Pages**
   - ที่ "Build and deployment" → Source เลือก **"GitHub Actions"** (ไม่ใช่ "Deploy from a branch")
4. Push ครั้งถัดไป (หรือกด **Actions → Deploy to GitHub Pages → Run workflow** เพื่อรันทันที
   โดยไม่ต้อง push ใหม่) — รอสัก 1-2 นาที จะได้ URL แบบ `https://username.github.io/repo-name/`

**ถ้าเคย deploy มาก่อนหน้านี้ด้วยวิธีอื่น (เช่น push โฟลเดอร์ dist/ เข้า branch gh-pages เอง)**
ให้ลบ deployment เก่าออกก่อนแล้ว deploy ใหม่ด้วยวิธีนี้ เพื่อให้ได้ไฟล์ที่มี `base: './'` และ
`HashRouter` ที่แก้ปัญหา 404 ไว้แล้วจริงๆ (ไฟล์เก่าที่เคย build ไว้ก่อนหน้านี้ยังมีปัญหาเดิมอยู่)

## สรุปการแก้ปัญหาที่ tester เจอ (รอบล่าสุด)

| ปัญหาที่เจอ | สาเหตุจริง | วิธีแก้ |
|---|---|---|
| ไม่มีปุ่ม logout/ย้อนกลับ | ปุ่ม logout อยู่ใน Sidebar ที่ซ่อนบนจอเล็ก (<900px) | เพิ่ม `TopBar.jsx` แสดงทุกขนาดจอ มีปุ่มกลับ+ออกจากระบบ |
| กล้องมุมกว้างเกินไป (ultra-wide) | มือถือหลายรุ่นเลือกเลนส์ ultra-wide เป็น default | `QRScanner.jsx` สั่ง zoom เข้า ~2x หลังเปิดกล้องสำเร็จ (ถ้าอุปกรณ์รองรับ) |
| สแกนแล้วหน้าขาว ไม่มีป๊อปอัพ/ช่องกรอก | โค้ดเอาค่าดิบ `"SKU\|น้ำหนัก"` ไปค้นหาทั้งก้อน หาไม่เจอเสมอ | เพิ่ม `parseScannedCode.js` แยก SKU/น้ำหนักถูกต้อง ใช้ครบทุกหน้าสแกน + เพิ่ม `ErrorBoundary` กันหน้าขาวจาก error อื่นๆในอนาคตด้วย |
| Error 404 บน GitHub Pages | (1) `base` path ไม่ relative ทำให้ asset หา path ผิดใน subpath (2) `BrowserRouter` ทำให้ refresh หน้า sub-route ยิง request จริงไปหา GitHub Pages แล้ว 404 | ตั้ง `base: './'` + เปลี่ยนเป็น `HashRouter` + เพิ่ม GitHub Actions workflow + `404.html` สำรอง |
| กล้องยังหยุดไม่สนิทตอนออกจากหน้าสแกน (`Cannot clear while scan is ongoing`) | เรียก `stop()` กับ `clear()` พร้อมกันโดยไม่รอ `stop()` เสร็จก่อน + error บางกรณีโยนแบบ synchronous ไม่ผ่าน Promise | แก้ `QRScanner.jsx` ให้ `clear()` รอ `stop()` เสร็จสมบูรณ์ก่อนเสมอ + ครอบ try/catch ทุกจุด |

## สรุปการแก้ปัญหารอบถัดไป (คีย์บอร์ด/ความเร็ว/ตัวพิมพ์เล็ก-ใหญ่)

| ปัญหาที่เจอ | สาเหตุจริง | วิธีแก้ |
|---|---|---|
| น้ำหนักที่สแกนได้เติมลงช่องจำนวนอัตโนมัติ ไม่อยากให้เติม | ตั้งใจทำไว้ตอนแรกเพื่อความเร็ว แต่ไม่ตรงความต้องการจริง | เอาออกทุกจุด (A2, B1, C, D1) เริ่มที่ 0 เสมอ ใช้ QtyStepper (+/-) หรือพิมพ์เอง |
| พิมพ์รหัสสินค้าตัวพิมพ์เล็ก/ใหญ่ปนกัน ระบบมองเป็นสินค้าคนละตัว | เทียบ SKU แบบ case-sensitive ทั้ง client และ Apps Script | uppercase SKU ที่จุดกำเนิดทุกจุด (`parseScannedCode.js`, ทุก service ที่ดึง sku จาก Sheet) + Apps Script เทียบแบบ case-insensitive ทั้ง read/update/delete |
| สแกน/กรอกรหัสแล้วรอ 5-7 วิ/SKU | ทุกครั้งที่สแกนยิง request ไปหา Apps Script ใหม่ (ความหน่วงสูงในตัว ~1-3+ วิ/ครั้ง) ทั้งที่ข้อมูลไม่เปลี่ยนระหว่าง session | สร้างระบบ cache (`useCachedData.js` + `productMasterCache.js`) ดึงสินค้าทั้งชุดมาเก็บในเครื่องครั้งเดียว โชว์ผลจาก cache ทันที + รีเฟรชสดเบื้องหลังทุกครั้งที่เข้าหน้า + ปุ่มรีเฟรชมือ + fallback ไปเช็ค Sheet สดถ้าหาในแคชไม่เจอ (SKU ใหม่) — ใช้กับ B, C, D1, E |
| คีย์บอร์ดมือถือบังปุ่ม/เนื้อหาตอนพิมพ์ | ปุ่มลอย (sticky bar) และ dialog ปักตำแหน่งชิด bottom ของ window ไม่ใช่ visible viewport ที่คีย์บอร์ดบังไปแล้ว | สร้าง `useKeyboardInset.js` (ใช้ visualViewport API) ขยับ `StickyActionBar`/`ConfirmDialog` ให้ลอยเหนือคีย์บอร์ดเสมอ + เพิ่ม `interactive-widget=resizes-visual` ใน viewport meta |



## ขั้นตอนถัดไป

โครงระบบ + ทุกโมดูล (A-F) เสร็จตามสเปกแล้ว ขั้นต่อไปคือทดสอบกับ Google Sheet จริง
(ตาม `apps-script/README.md`) และทดสอบบนอุปกรณ์จริงตามที่สเปกกำชับไว้ — แจ้งได้เลยถ้าต้องการ
ให้ช่วยรีวิวจุดใดเพิ่มเติม หรือปรับแต่งรายละเอียดหน้าจอใดหน้าจอหนึ่ง
