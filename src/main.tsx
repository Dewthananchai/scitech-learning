import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import { LayoutProvider } from './store/LayoutContext'
import { AuthProvider } from './store/AuthContext'
import App from './App'
import { initCloudSync, cloudSyncConfigured } from './lib/cloudSync'
import { runProductionResetIfNeeded } from './lib/productionReset'
import './index.css'

// ย้ายรหัสผ่านเข้าระบบ auth ของ Supabase ครั้งเดียว (หลังแอปโหลดแล้ว ไม่บล็อกหน้า)
void import('./lib/supabaseAuth').then(m =>
  setTimeout(() => void m.backfillAuthUsersIfNeeded().catch(() => {}), 3000)
)

function boot() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <AppProvider>
            <LayoutProvider>
              <App />
            </LayoutProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

// ถ้าตั้งค่า Supabase ไว้: ล้างข้อมูลตัวอย่างครั้งแรก → ดึงข้อมูลล่าสุดจากคลาวด์ → เปิดแอป (สปลาช 2 วิ)
if (cloudSyncConfigured()) {
  const timeout = new Promise<void>(res => setTimeout(res, 2000))
  Promise.race([
    runProductionResetIfNeeded().then(() => initCloudSync()),
    timeout,
  ]).finally(boot)
} else {
  runProductionResetIfNeeded().finally(boot)
}
