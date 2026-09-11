import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import { LayoutProvider } from './store/LayoutContext'
import { AuthProvider } from './store/AuthContext'
import App from './App'
import { initCloudSync, cloudSyncConfigured } from './lib/cloudSync'
import './index.css'

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

// ถ้าตั้งค่า Supabase ไว้: ดึงข้อมูลล่าสุดจากคลาวด์ก่อนเปิดแอป (สปลาช 1.5 วิ)
if (cloudSyncConfigured()) {
  const timeout = new Promise<void>(res => setTimeout(res, 1500))
  Promise.race([initCloudSync(), timeout]).finally(boot)
} else {
  boot()
}
