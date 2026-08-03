import { useEffect, useRef, useState } from 'react'
import { newInstanceId } from '../utils/transactionId'

const CHANNEL_NAME = 'stockapp-instance-lock'

/**
 * useInstanceLock — เตือนถ้ามีอีกแท็บ/หน้าต่างของเว็บแอปนี้เปิดค้างอยู่บนเครื่องเดียวกัน
 * ทำงานโดย broadcast "ping" ตอน mount แล้วฟังว่ามีใครตอบกลับไหม
 * ถ้ามีคนตอบ = มีอีก instance เปิดอยู่จริง -> ให้ UI เตือนผู้ใช้
 */
export function useInstanceLock() {
  const [otherInstanceDetected, setOtherInstanceDetected] = useState(false)
  const instanceIdRef = useRef(newInstanceId())
  const channelRef = useRef(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined // เบราว์เซอร์เก่าไม่รองรับ ข้ามไปเงียบๆ

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel
    const myId = instanceIdRef.current

    channel.onmessage = (event) => {
      const msg = event.data
      if (!msg || msg.instanceId === myId) return
      if (msg.type === 'ping') {
        // มีแท็บใหม่ถามมา -> ตอบกลับว่าเรายังอยู่
        channel.postMessage({ type: 'pong', instanceId: myId })
      } else if (msg.type === 'pong') {
        // มีแท็บเก่าตอบกลับมา -> แปลว่าเราคือแท็บใหม่ที่เปิดซ้อน
        setOtherInstanceDetected(true)
      }
    }

    channel.postMessage({ type: 'ping', instanceId: myId })

    return () => channel.close()
  }, [])

  return { instanceId: instanceIdRef.current, otherInstanceDetected }
}
