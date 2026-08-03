// แปลงค่า GPS ที่ได้จาก useGeolocation ให้เป็นคอลัมน์มาตรฐาน แนบกับทุกแถวที่เขียนเข้า Sheet
// ใช้ร่วมกันทุก service เพื่อให้ชื่อคอลัมน์ตรงกันเป๊ะทุก Tab (ตามสเปกข้อ 10 — ทุก transaction
// ต้องมี GPS กำกับ และต้องดึงใหม่ทุกครั้ง ไม่ใช่ใช้ค่าตอน login ค้างไว้ทั้งวัน)
export function gpsColumns(gps) {
  return {
    'GPS Lat': gps?.lat ?? '',
    'GPS Lng': gps?.lng ?? ''
  }
}
