import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { todayKey, isDifferentDay } from '../utils/dateUtils'

const STORAGE_KEY = 'stockapp_session'
const AuthContext = createContext(null)

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    // ข้ามวันใหม่ (เลย 00:00) -> บังคับ login ใหม่เสมอ ตามสเปก
    if (isDifferentDay(session.loginDateKey)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  // เผื่อแอปเปิดค้างข้ามเที่ยงคืนโดยไม่ได้ปิด — เช็คซ้ำเป็นระยะว่าเข้าวันใหม่หรือยัง
  useEffect(() => {
    const interval = setInterval(() => {
      setSession((prev) => {
        if (prev && isDifferentDay(prev.loginDateKey)) {
          localStorage.removeItem(STORAGE_KEY)
          return null
        }
        return prev
      })
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // ขั้นที่ 1: ยืนยันตัวตนระดับสาขา (เรียกหลัง verifyBranchLogin สำเร็จจากฝั่ง Apps Script แล้ว)
  const setBranch = useCallback((branch) => {
    setSession((prev) => {
      const next = {
        ...(prev || {}),
        branchCode: branch.branchCode,
        branchName: branch.branchName,
        branchType: branch.branchType, // 'บริษัท' | 'ห้าง'
        loginDateKey: todayKey(),
        employeeName: null,
        gps: null
      }
      // persist ไว้ด้วย ไม่งั้นถ้า refresh หน้าระหว่างขั้นที่ 1-2 จะเสียสาขาที่เลือกไว้
      // (isFullyLoggedIn ยังเป็น false อยู่จนกว่าจะ completeLogin เสร็จ ไม่ถือว่า login สมบูรณ์)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // ขั้นที่ 2: ระบุตัวตนพนักงาน + gps -> ถือว่า login สมบูรณ์ บันทึกลง localStorage
  const completeLogin = useCallback((employeeName, gps) => {
    setSession((prev) => {
      const next = { ...(prev || {}), employeeName, gps, loginDateKey: todayKey() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // อัปเดต GPS เฉพาะจุด (ดึงใหม่ทุก transaction สำคัญ ไม่ทับ field อื่น)
  const updateGps = useCallback((gps) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, gps }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  const isBranchSelected = !!session?.branchCode
  const isFullyLoggedIn = !!session?.employeeName

  const value = useMemo(
    () => ({ session, setBranch, completeLogin, updateGps, logout, isBranchSelected, isFullyLoggedIn }),
    [session, setBranch, completeLogin, updateGps, logout, isBranchSelected, isFullyLoggedIn]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth ต้องถูกใช้ภายใน <AuthProvider>')
  return ctx
}

// ใช้ audit ทุก transaction: {branchCode, branchName, branchType, employeeName, gps, time}
export function buildAuditStamp(session) {
  return {
    branchCode: session?.branchCode ?? null,
    branchName: session?.branchName ?? null,
    employeeName: session?.employeeName ?? null,
    gpsLat: session?.gps?.lat ?? null,
    gpsLng: session?.gps?.lng ?? null,
    timestamp: new Date().toISOString()
  }
}
