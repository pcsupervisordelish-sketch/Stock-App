import { Component } from 'react'

/**
 * ErrorBoundary — ด่านสุดท้ายกันหน้าขาว (blank white screen) เด็ดขาด
 * React error boundary รองรับเฉพาะ class component เท่านั้น ไม่มี hook เทียบเท่า
 *
 * ทำไมต้องมี: ถ้ามี error ที่ไม่คาดคิดเกิดขึ้นระหว่าง render (เช่น field จาก Sheet ที่ไม่ครบ,
 * ข้อมูล QR รูปแบบแปลกที่ยังไม่เคยเจอ) React ปกติจะ unmount ทั้งต้นไม้ทันทีกลายเป็นหน้าขาวเปล่า
 * ไม่บอกอะไรผู้ใช้เลย — ตัวนี้ดักไว้แสดงหน้าจอกู้คืนแทน พร้อมปุ่มกลับหน้าแรกโดยไม่ต้องปิดแอปทิ้ง
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // log ไว้ดูใน console เพื่อ debug ภายหลัง (ไม่มี server-side error tracking ในเวอร์ชันนี้)
    console.error('[ErrorBoundary] จับ error ที่ไม่คาดคิดได้:', error, errorInfo)
  }

  handleReset = () => {
    // กลับไปหน้าแรกของแอปแล้วเคลียร์ error state — ไม่ reload ทั้งหน้าเพื่อไม่ให้เจอ 404
    // ซ้ำถ้า deploy อยู่ผิด base path (แก้ที่ HashRouter/base ไปแล้ว แต่กันไว้อีกชั้น)
    this.setState({ hasError: false, error: null })
    window.location.hash = '#/home'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h1 style={styles.title}>เกิดข้อผิดพลาดที่ไม่คาดคิด</h1>
            <p style={styles.text}>
              ระบบพบปัญหาระหว่างแสดงผลหน้านี้ ข้อมูลที่กรอกไว้ในหน้าอื่นยังปลอดภัยอยู่
              (บันทึกอัตโนมัติไว้แล้ว) กดปุ่มด้านล่างเพื่อกลับไปหน้าหลักแล้วลองใหม่ได้เลย
            </p>
            <button style={styles.button} onClick={this.handleReset}>
              กลับหน้าหลัก
            </button>
            {this.state.error && (
              <details style={styles.details}>
                <summary>รายละเอียดทางเทคนิค (สำหรับแจ้งผู้ดูแลระบบ)</summary>
                <pre style={styles.pre}>{String(this.state.error?.message || this.state.error)}</pre>
              </details>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: '#F8FAFA',
    fontFamily: "'Noto Sans Thai', 'Sarabun', system-ui, -apple-system, sans-serif"
  },
  card: {
    background: 'white',
    borderRadius: 14,
    padding: 32,
    maxWidth: 420,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(15,23,22,0.08), 0 1px 2px rgba(15,23,22,0.06)'
  },
  title: { fontSize: 22, fontWeight: 800, margin: '0 0 12px 0', color: '#111827' },
  text: { fontSize: 16, color: '#4B5563', lineHeight: 1.6, marginBottom: 24 },
  button: {
    minHeight: 56,
    width: '100%',
    fontSize: 18,
    fontWeight: 700,
    color: 'white',
    background: '#0F766E',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer'
  },
  details: { marginTop: 20, textAlign: 'left', fontSize: 13, color: '#9CA3AF' },
  pre: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F8FAFA', padding: 10, borderRadius: 8 }
}
