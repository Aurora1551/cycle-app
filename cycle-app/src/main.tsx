import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import './styles.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/push'

// Register service worker for push notifications
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
