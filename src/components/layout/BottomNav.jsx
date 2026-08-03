import { NavLink } from 'react-router-dom'
import './BottomNav.css'

// Bottom navigation จอเล็ก — ไอคอน+ข้อความกำกับเสมอ ตาม H4 (ห้ามไอคอนล้วน)
export default function BottomNav({ items }) {
  return (
    <nav className="bottomnav">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `bottomnav__item ${isActive ? 'is-active' : ''}`}
        >
          <span className="bottomnav__icon">{item.icon}</span>
          <span className="bottomnav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
