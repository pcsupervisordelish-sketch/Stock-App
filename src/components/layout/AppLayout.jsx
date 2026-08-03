import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMenuForBranchType } from '../../config/menuConfig'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import InstanceLockBanner from '../InstanceLockBanner'
import OfflineBanner from '../OfflineBanner'

// เส้นทางที่จำกัดเฉพาะประเภทสาขา — กันเข้าผ่าน URL ตรงทั้งที่เมนูซ่อนไว้แล้ว (A = บริษัทเท่านั้น, D/E = ห้างเท่านั้น)
const BRANCH_ONLY_PREFIXES = [
  { prefix: '/stock-count', allowedType: 'บริษัท' },
  { prefix: '/dept', allowedType: 'ห้าง' }
]

function isRouteAllowed(pathname, branchType) {
  const restriction = BRANCH_ONLY_PREFIXES.find((r) => pathname.startsWith(r.prefix))
  if (!restriction) return true // เส้นทางที่ใช้ร่วมกัน (B/C/F/home) ไม่มีข้อจำกัด
  return restriction.allowedType === branchType
}

export default function AppLayout() {
  const { session, isFullyLoggedIn } = useAuth()
  const location = useLocation()

  if (!isFullyLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (!isRouteAllowed(location.pathname, session.branchType)) {
    return <Navigate to="/home" replace />
  }

  const items = getMenuForBranchType(session.branchType)

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar items={items} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <OfflineBanner />
        <InstanceLockBanner />
        <div className="page">
          <Outlet />
        </div>
        <BottomNav items={items} />
      </div>
    </div>
  )
}
