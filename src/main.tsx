import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import { LayoutProvider } from './store/LayoutContext'
import { AuthProvider } from './store/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
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
