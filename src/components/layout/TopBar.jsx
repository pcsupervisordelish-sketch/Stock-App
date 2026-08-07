import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getBackTarget } from '../../utils/backNavigation'
import ConfirmDialog from '../ui/ConfirmDialog'
import Clock from '../ui/Clock'
import './TopBar.css'

export default function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(false)

  const backTarget = getBackTarget(location.pathname)

  return (
    <div className="topbar">
      <div className="topbar__left">
        {backTarget && (
          <button className="topbar__back" onClick={() => navigate(backTarget)} aria-label="ย้อนกลับ">
            ← กลับ
          </button>
        )}
      </div>

      <div className="topbar__center">
        <span className="topbar__branch">{session?.branchName}</span>
        <Clock className="topbar__clock" />
      </div>

      <button className="topbar__logout" onClick={() => setConfirmLogout(true)} aria-label="ออกจากระบบ">
        ออกจากระบบ
      </button>

      <ConfirmDialog
        open={confirmLogout}
        title="ออกจากระบบ"
        message={`ออกจากระบบสำหรับคุณ${session?.employeeName || ''} ตอนนี้? ต้อง Login ใหม่ก่อนทำรายการต่อ`}
        confirmLabel="ออกจากระบบ"
        danger
        onConfirm={() => {
          setConfirmLogout(false)
          logout()
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  )
}
