import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import App from './App'
import { ThemeProvider } from '@/stores/ThemeContext'
import { LangProvider } from '@/stores/LangContext'
import { AuthProvider } from '@/stores/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>,
)
