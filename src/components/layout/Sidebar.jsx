import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Clock from '../ui/Clock'
import './Sidebar.css'

export default function Sidebar({ items }) {
  const { session, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-title">📦 สต๊อกหน้าร้าน</span>
        <Clock className="sidebar__brand-clock" />
      </div>
      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar__item ${isActive ? 'is-active' : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div style={{ fontWeight: 700 }}>{session?.branchName}</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{session?.employeeName}</div>
        </div>
        <button className="sidebar__logout" onClick={logout} type="button">
          เปลี่ยนผู้ใช้งาน/สาขา
        </button>
      </div>
    </aside>
  )
}
