import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ReturnsHomePage from './pages/returns/ReturnsHomePage'
import ReturnsScanPage from './pages/returns/ReturnsScanPage'
import ReturnsPendingPage from './pages/returns/ReturnsPendingPage'
import ReturnsHistoryPage from './pages/returns/ReturnsHistoryPage'
import StockCountHomePage from './pages/stockcount/StockCountHomePage'
import StockCountImportPage from './pages/stockcount/StockCountImportPage'
import StockCountScanPage from './pages/stockcount/StockCountScanPage'
import StockCountSummaryPage from './pages/stockcount/StockCountSummaryPage'
import StockCountDiffReportPage from './pages/stockcount/StockCountDiffReportPage'
import StockCountMissingSkuPage from './pages/stockcount/StockCountMissingSkuPage'
import StockCountHistoryPage from './pages/stockcount/StockCountHistoryPage'
import ReceivingScanPage from './pages/receiving/ReceivingScanPage'
import ReceivingSummaryPage from './pages/receiving/ReceivingSummaryPage'
import DeptCountHomePage from './pages/dept/DeptCountHomePage'
import DeptCountScanPage from './pages/dept/DeptCountScanPage'
import DeptCountSummaryPage from './pages/dept/DeptCountSummaryPage'
import DeptClosingHomePage from './pages/dept/DeptClosingHomePage'
import DeptClosingDetailPage from './pages/dept/DeptClosingDetailPage'
import DeptCurrentStockPage from './pages/dept/DeptCurrentStockPage'
import PrintExportHomePage from './pages/printexport/PrintExportHomePage'
import ReceivingPrintPage from './pages/printexport/ReceivingPrintPage'
import ReturnsPrintPage from './pages/printexport/ReturnsPrintPage'
import DeptClosingPrintPage from './pages/printexport/DeptClosingPrintPage'
import CompanyCountPrintPage from './pages/printexport/CompanyCountPrintPage'
import OrderHomePage from './pages/order/OrderHomePage'
import OrderDatePage from './pages/order/OrderDatePage'
import OrderSelectPage from './pages/order/OrderSelectPage'
import OrderCartPage from './pages/order/OrderCartPage'
import OrderHistoryPage from './pages/order/OrderHistoryPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />

            {/* โมดูล A — นับสต๊อกสาขาบริษัท (เทียบ SAP) */}
            <Route path="/stock-count" element={<StockCountHomePage />} />
            <Route path="/stock-count/import" element={<StockCountImportPage />} />
            <Route path="/stock-count/scan" element={<StockCountScanPage />} />
            <Route path="/stock-count/summary" element={<StockCountSummaryPage />} />
            <Route path="/stock-count/report" element={<StockCountDiffReportPage />} />
            <Route path="/stock-count/missing" element={<StockCountMissingSkuPage />} />
            <Route path="/stock-count/history" element={<StockCountHistoryPage />} />

            {/* โมดูล B — รับสินค้าเข้า (ใช้ร่วม 2 ประเภทสาขา) */}
            <Route path="/receiving" element={<ReceivingScanPage />} />
            <Route path="/receiving/summary" element={<ReceivingSummaryPage />} />

            {/* โมดูล C — บันทึก/ตีคืนสินค้า (ใช้ร่วม 2 ประเภทสาขา) */}
            <Route path="/returns" element={<ReturnsHomePage />} />
            <Route path="/returns/scan/:category" element={<ReturnsScanPage />} />
            <Route path="/returns/pending" element={<ReturnsPendingPage />} />
            <Route path="/returns/history" element={<ReturnsHistoryPage />} />

            {/* โมดูล D — เฉพาะสาขาห้าง */}
            <Route path="/dept/count" element={<DeptCountHomePage />} />
            <Route path="/dept/count/scan/:type" element={<DeptCountScanPage />} />
            <Route path="/dept/count/summary/:type" element={<DeptCountSummaryPage />} />
            <Route path="/dept/closing" element={<DeptClosingHomePage />} />
            <Route path="/dept/closing/:date" element={<DeptClosingDetailPage />} />
            <Route path="/dept/stock" element={<DeptCurrentStockPage />} />
            <Route path="/dept/orders" element={<OrderHomePage />} />
            <Route path="/dept/orders/history" element={<OrderHistoryPage />} />
            <Route path="/dept/orders/:area/date" element={<OrderDatePage />} />
            <Route path="/dept/orders/:area/select" element={<OrderSelectPage />} />
            <Route path="/dept/orders/:area/cart" element={<OrderCartPage />} />

            {/* โมดูล F — ปริ้น/Export (รวมศูนย์) */}
            <Route path="/print-export" element={<PrintExportHomePage />} />
            <Route path="/print-export/receiving" element={<ReceivingPrintPage />} />
            <Route path="/print-export/receiving/:batchId" element={<ReceivingPrintPage />} />
            <Route path="/print-export/returns" element={<ReturnsPrintPage />} />
            <Route path="/print-export/dept-closing" element={<DeptClosingPrintPage />} />
            <Route path="/print-export/dept-closing/:date" element={<DeptClosingPrintPage />} />
            <Route path="/print-export/company-count" element={<CompanyCountPrintPage />} />
            <Route path="/print-export/company-count/:date" element={<CompanyCountPrintPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
