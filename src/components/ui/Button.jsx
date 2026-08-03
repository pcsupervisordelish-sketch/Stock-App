import './Button.css'

/**
 * Button — ใช้ปุ่มนี้แทน <button> ตรงๆ ทุกจุดที่เกี่ยวข้องกับโหลด/ส่งข้อมูล
 * ทำตามข้อบังคับ: disable ทันทีระหว่างรอผล + แสดง spinner/ข้อความสถานะชัดเจน
 * ห้ามกดซ้ำได้เด็ดขาดระหว่าง loading (aria-disabled + disabled จริง กันทั้งเมาส์/คีย์บอร์ด/สกรีนรีดเดอร์)
 *
 * variant: 'primary' (ปุ่มหลัก เต็มสี) | 'secondary' (ปุ่มรอง outline) | 'danger'
 * size: 'lg' (60-64px มาตรฐานทั้งระบบ) | 'md'
 */
export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  loadingText = 'กำลังดำเนินการ...',
  fullWidth = true,
  type = 'button',
  ...rest
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size}`}
      style={fullWidth ? { width: '100%' } : undefined}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className="btn__loading">
          <span className="btn__spinner" aria-hidden="true" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
