import './NumericInput.css'

/**
 * NumericInput — ช่องกรอกจำนวนสินค้า จุดที่สำคัญที่สุดในหน้าจอสแกน/นับ ตามสเปก H3
 * ตัวเลขใหญ่ 34px+, ปุ่ม +/- ข้างๆ ให้แตะง่ายโดยไม่ต้องเปิดคีย์บอร์ดเสมอไป
 * validate: ห้ามติดลบ, ห้ามค่าผิดปกติเกินจริง (ป้องกันตามข้อกำชับ data validation)
 */
export default function NumericInput({ label, value, onChange, unit, max = 100000, autoFocus = false }) {
  const clamp = (n) => {
    if (Number.isNaN(n)) return 0
    if (n < 0) return 0
    if (n > max) return max
    return n
  }

  const step = (delta) => onChange(clamp((Number(value) || 0) + delta))

  return (
    <div className="numinput">
      {label && <label className="numinput__label">{label}</label>}
      <div className="numinput__row">
        <button
          type="button"
          className="numinput__step"
          onClick={() => step(-1)}
          aria-label="ลดจำนวน"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          className="numinput__field"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          min={0}
          max={max}
        />
        <button
          type="button"
          className="numinput__step"
          onClick={() => step(1)}
          aria-label="เพิ่มจำนวน"
        >
          +
        </button>
      </div>
      {unit && <div className="numinput__unit">หน่วย: {unit}</div>}
    </div>
  )
}
