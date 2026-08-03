import { nowDateTimeLabel } from '../../utils/dateUtils'

export default function DocumentHeader({ docTypeName, branchName, employeeName, printLog }) {
  return (
    <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{docTypeName}</div>
      <div style={{ fontSize: 14, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 12, color: '#333' }}>
        <span>สาขา: {branchName}</span>
        <span>ผู้ทำรายการ: {employeeName}</span>
        <span>พิมพ์/แชร์ล่าสุด: {printLog ? nowDateTimeLabel(new Date(printLog.lastPrintedAt)) : 'ยังไม่เคยปริ้น'}</span>
        {printLog && printLog.count > 1 && <span>เวอร์ชัน v{printLog.count}</span>}
      </div>
    </div>
  )
}
