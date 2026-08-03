import { useCallback, useState } from 'react'

/**
 * useGeolocation — ดึง GPS ใหม่ทุกครั้งที่เรียก getCurrentPosition()
 * ตามสเปก: ต้องดึงใหม่ทุก transaction สำคัญ ไม่ใช่ดึงครั้งเดียวตอน login แล้วใช้ทั้งวัน
 */
export function useGeolocation() {
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState(null)

  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setStatus('error')
        setError('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง')
        resolve(null)
        return
      }
      setStatus('loading')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStatus('success')
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        },
        (err) => {
          setStatus('error')
          setError('ดึงตำแหน่งไม่สำเร็จ (' + err.message + ') — ระบบจะบันทึกรายการต่อได้ตามปกติ')
          resolve(null) // ไม่บล็อกการทำงานหลักถ้า GPS ใช้ไม่ได้
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
      )
    })
  }, [])

  return { getCurrentPosition, status, error }
}
