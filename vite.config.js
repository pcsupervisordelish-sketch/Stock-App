import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ระบบจัดการสต๊อกหน้าร้าน — ตั้งค่า PWA ตามสเปกหมวด "ติดตั้งเป็น PWA"
// - standalone display (ไม่มีแถบ URL)
// - offline caching เบื้องต้นสำหรับ static asset เท่านั้น (ข้อมูลจริงยังต้องพึ่งเน็ต)
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'ระบบจัดการสต๊อกหน้าร้าน',
        short_name: 'สต๊อกหน้าร้าน',
        description: 'ระบบนับสต๊อก รับเข้า ตีคืน และกระทบยอดขายหน้าร้าน',
        theme_color: '#0F766E',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // cache เฉพาะ static asset (JS/CSS/HTML/ไอคอน) ไม่ cache การเรียก Apps Script API
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})
