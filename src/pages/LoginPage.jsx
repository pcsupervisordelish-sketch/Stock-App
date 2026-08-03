import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { getBranches, verifyBranchLogin, SheetsServiceError } from '../services/sheetsService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/layout/PageHeader'

export default function LoginPage() {
  const { session, isBranchSelected, isFullyLoggedIn, setBranch, completeLogin } = useAuth()
  const { show } = useToast()
  const { getCurrentPosition } = useGeolocation()

  const [step, setStep] = useState(isBranchSelected ? 2 : 1)

  // --- ขั้นที่ 1: เลือกสาขา + รหัสผ่านสาขา ---
  const [branches, setBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [branchLoadError, setBranchLoadError] = useState(null)
  const [selectedBranchCode, setSelectedBranchCode] = useState('')
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  // --- ขั้นที่ 2: ชื่อพนักงาน ---
  const [employeeName, setEmployeeName] = useState('')
  const [submittingStep2, setSubmittingStep2] = useState(false)

  useEffect(() => {
    if (step !== 1) return
    let cancelled = false
    setLoadingBranches(true)
    setBranchLoadError(null)
    getBranches()
      .then((data) => {
        if (!cancelled) setBranches(data.filter((b) => b.active !== false))
      })
      .catch((err) => {
        if (!cancelled) setBranchLoadError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingBranches(false)
      })
    return () => {
      cancelled = true
    }
  }, [step])

  if (isFullyLoggedIn) return <Navigate to="/home" replace />

  const handleVerifyBranch = async () => {
    if (!selectedBranchCode || !password) return
    setVerifying(true)
    try {
      const result = await verifyBranchLogin(selectedBranchCode, password)
      if (!result.valid) {
        show('รหัสผ่านสาขาไม่ถูกต้อง กรุณาลองใหม่', { type: 'error' })
        return
      }
      setBranch({
        branchCode: result.branchCode,
        branchName: result.branchName,
        branchType: result.branchType
      })
      setStep(2)
    } catch (err) {
      show(err instanceof SheetsServiceError ? err.message : 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่', { type: 'error' })
    } finally {
      setVerifying(false)
    }
  }

  const handleCompleteLogin = async () => {
    if (!employeeName.trim()) return
    setSubmittingStep2(true)
    try {
      const gps = await getCurrentPosition()
      completeLogin(employeeName.trim(), gps)
      show(`ยินดีต้อนรับ คุณ${employeeName.trim()}`, { type: 'success' })
    } finally {
      setSubmittingStep2(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 440, paddingTop: 48 }}>
      <PageHeader
        title="เข้าสู่ระบบ"
        subtitle={step === 1 ? 'ขั้นที่ 1 จาก 2 — เลือกสาขา' : 'ขั้นที่ 2 จาก 2 — ระบุตัวตนผู้ทำรายการ'}
      />

      {step === 1 && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {loadingBranches && <p>กำลังโหลดรายชื่อสาขา...</p>}
          {branchLoadError && (
            <p style={{ color: 'var(--color-danger)' }}>
              โหลดรายชื่อสาขาไม่สำเร็จ: {branchLoadError}
            </p>
          )}
          {!loadingBranches && !branchLoadError && (
            <>
              <div>
                <label style={fieldLabel}>เลือกสาขา</label>
                <select
                  style={selectStyle}
                  value={selectedBranchCode}
                  onChange={(e) => setSelectedBranchCode(e.target.value)}
                >
                  <option value="">— เลือกสาขา —</option>
                  {branches.map((b) => (
                    <option key={b.branchCode} value={b.branchCode}>
                      {b.branchName} ({b.branchType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>รหัสผ่านประจำสาขา</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyBranch()}
                />
              </div>
              <Button
                onClick={handleVerifyBranch}
                loading={verifying}
                disabled={!selectedBranchCode || !password}
              >
                ถัดไป
              </Button>
            </>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            สาขา: <strong>{session?.branchName}</strong>
          </p>
          <div>
            <label style={fieldLabel}>ชื่อผู้ทำรายการ</label>
            <input
              style={inputStyle}
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCompleteLogin()}
              autoFocus
            />
          </div>
          <Button onClick={handleCompleteLogin} loading={submittingStep2} disabled={!employeeName.trim()}>
            เข้าใช้งาน
          </Button>
        </Card>
      )}
    </div>
  )
}

const fieldLabel = { display: 'block', fontSize: 18, fontWeight: 700, marginBottom: 8 }
const inputStyle = {
  width: '100%',
  minHeight: 'var(--button-height)',
  fontSize: 20,
  padding: '0 16px',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)'
}
const selectStyle = { ...inputStyle }
