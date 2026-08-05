import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// ใช้ HashRouter (ไม่ใช่ BrowserRouter) โดยตั้งใจ — เมื่อ deploy บน static host อย่าง
// GitHub Pages ที่ไม่รองรับ server-side routing การ refresh หน้าที่ path ลึกๆ (เช่น
// /dept/orders/booth/select) ด้วย BrowserRouter จะทำให้ host พยายามหาไฟล์จริงที่ path นั้น
// แล้วเจอ 404 ทันที HashRouter เก็บ route ไว้หลัง # (เช่น /#/dept/orders/booth/select)
// ซึ่งไม่เคยถูกส่งไปที่ server เลย แก้ปัญหา 404-ตอน-refresh ได้แบบสมบูรณ์ไม่ว่าจะ deploy ที่ไหน
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
