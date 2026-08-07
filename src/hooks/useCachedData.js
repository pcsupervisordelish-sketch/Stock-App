import { useCallback, useEffect, useRef, useState } from 'react'

const CACHE_PREFIX = 'cache:'

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data))
  } catch {
    /* localStorage เต็ม/ปิดใช้งาน — ไม่กระทบการทำงาน แค่ไม่มี cache ให้ใช้รอบหน้า */
  }
}

/**
 * useCachedData — ดึงข้อมูลแบบ "cache-first, revalidate in background"
 * แก้ปัญหาหลัก: ทุกครั้งที่สแกน/กรอกรหัสสินค้าเดิมต้องยิง network ไปหา Google Sheet ใหม่
 * (ผ่าน Apps Script ที่มีความหน่วงสูงในตัว ~1-3+ วินาทีต่อครั้ง) ทำให้รวมแล้วช้ามากถ้ามีหลายร้อย SKU
 *
 * วิธีแก้: ดึงข้อมูลทั้งชุดมาเก็บไว้ใน localStorage "ครั้งเดียวตอนเข้าหน้า" แทนที่จะยิงทีละ SKU
 * ทุกครั้ง แล้ว lookup จากในเครื่อง (เร็วระดับ millisecond ไม่ต้องรอ network เลย)
 *
 * รูปแบบการทำงาน:
 * 1. mount ครั้งแรก -> โชว์ข้อมูลจาก cache ทันที (ถ้ามีจากครั้งก่อน) ใช้งานได้เลยไม่ต้องรอ
 * 2. พร้อมกันนั้น ดึงข้อมูลสดจาก Sheet มาเบื้องหลัง (ไม่บล็อก UI) เสร็จแล้วอัปเดตทั้ง state
 *    และ cache ให้เป็นชุดล่าสุดเงียบๆ (SKU ที่เพิ่ม/ลบ/แก้ไขใน Sheet จะเข้ามาอัตโนมัติรอบถัดไป)
 * 3. มีปุ่ม refresh ให้เรียกเองได้ทันทีถ้ารู้ว่ามีการแก้ไข Sheet มาใหม่ๆ ไม่อยากรอ
 *
 * key ควรรวมสิ่งที่ทำให้ข้อมูลเปลี่ยนความหมาย (เช่น สาขา/พื้นที่/วันที่) กัน cache ข้ามกันผิด
 */
export function useCachedData(key, fetchFn) {
  const [data, setData] = useState(() => readCache(key))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)
  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn // ใช้ ref กัน refresh ถูกสร้างใหม่ทุก render จาก fetchFn ที่เปลี่ยน reference

  const refresh = useCallback(() => {
    setRefreshing(true)
    setError(null)
    fetchFnRef
      .current()
      .then((fresh) => {
        if (!mountedRef.current) return
        setData(fresh)
        writeCache(key, fresh)
      })
      .catch((err) => {
        if (mountedRef.current) setError(err.message || 'โหลดข้อมูลไม่สำเร็จ')
      })
      .finally(() => {
        if (mountedRef.current) setRefreshing(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    mountedRef.current = true
    setData(readCache(key)) // key เปลี่ยน (เช่น สลับสาขา) -> โหลด cache ของ key ใหม่ทันที
    refresh() // แล้วรีเฟรชสดในเบื้องหลังเสมอทุกครั้งที่เข้าหน้า/key เปลี่ยน
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = data === null && refreshing // รอจริงเฉพาะตอนไม่มี cache เลย (ครั้งแรกสุด)

  return { data, loading, refreshing, error, refresh }
}
