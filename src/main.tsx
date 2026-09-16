import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import { LayoutProvider } from './store/LayoutContext'
import { AuthProvider } from './store/AuthContext'
import App from './App'
import { initCloudSync, cloudSyncConfigured } from './lib/cloudSync'
import { initRecordSync } from './api/recordApi'
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

// ถ้าตั้งค่า Supabase ไว้: ล้างข้อมูลตัวอย่างครั้งแรก → ดึงข้อมูลล่าสุดจากคลาวด์ → เปิดแอป
// ต้อง "รอ hydrate จากคลาวด์เสร็จก่อน" ค่อย mount React — เครื่องใหม่ที่ localStorage ยังว่าง
// ถ้า mount ก่อนข้อมูลมา state เริ่มต้น [] จะถูกเขียนทับขึ้นคลาวด์ (สาเหตุของ
// "ย้ายเครื่องแล้วบทเรียนหาย") — จำกัดเวลารอสูงสุด 10 วิ กันเน็ตห่าง/คลาวด์ล่ม
// (ถ้าหมดเวลาจะเปิดแอปก่อน แล้วให้ polling ซิงก์ข้อมูลตามหลัง)
if (cloudSyncConfigured()) {
  const startup = runProductionResetIfNeeded()
    .then(() => initCloudSync())
    .then(() => initRecordSync()) // ตารางจริง: backfill + realtime (ไม่บล็อก boot)
    .catch(err => { console.warn('[boot] init cloud sync failed:', err) })
  const bootCap = new Promise<void>(res => setTimeout(res, 10000))
  Promise.race([startup, bootCap]).finally(boot)
} else {
  runProductionResetIfNeeded().finally(boot)
}
