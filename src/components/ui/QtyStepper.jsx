/**
 * QtyStepper — ปุ่ม −/+ กะทัดรัด ใช้แก้จำนวนในแถว list (ตะกร้า/รายการที่สแกนแล้ว)
 * ต่างจาก NumericInput (ใหญ่ เอาไว้กรอกตอนเพิ่มรายการใหม่ทีละตัว) — ตัวนี้ใช้ในแถวที่มีของหลายชิ้น
 * พร้อมกัน จึงเล็กกว่า แต่ยังคงขนาดกดง่ายกว่า native spinner ของ input number ทั่วไปมาก
 */
export default function QtyStepper({ value, onChange, min = 0, max = 100000 }) {
  const clamp = (n) => {
    if (Number.isNaN(n)) return min
    return Math.max(min, Math.min(max, n))
  }
  const step = (delta) => onChange(clamp(Number(value || 0) + delta))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button type="button" onClick={() => step(-1)} aria-label="ลดจำนวน" style={btnStyle}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        style={fieldStyle}
      />
      <button type="button" onClick={() => step(1)} aria-label="เพิ่มจำนวน" style={btnStyle}>
        +
      </button>
    </div>
  )
}

const btnStyle = {
  width: 40,
  height: 40,
  minWidth: 40,
  flexShrink: 0,
  fontSize: 20,
  fontWeight: 800,
  borderRadius: 8,
  border: '2px solid var(--color-primary)',
  background: 'white',
  color: 'var(--color-primary)',
  cursor: 'pointer'
}

const fieldStyle = {
  width: 54,
  height: 40,
  textAlign: 'center',
  fontSize: 18,
  fontWeight: 700,
  borderRadius: 8,
  border: '2px solid var(--color-border)'
}
