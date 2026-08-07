import './StickyActionBar.css'
import { useKeyboardInset } from '../../hooks/useKeyboardInset'

export default function StickyActionBar({ children }) {
  const keyboardInset = useKeyboardInset()
  // คีย์บอร์ดเปิดอยู่ -> ยกปุ่มขึ้นเหนือคีย์บอร์ดพอดี (ไม่งั้นคีย์บอร์ดจะบังปุ่มไว้มองไม่เห็น)
  return (
    <div className="sticky-action-bar" style={keyboardInset > 0 ? { bottom: keyboardInset } : undefined}>
      {children}
    </div>
  )
}
