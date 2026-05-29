import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// When a new version is deployed, the service worker updates and
// reloads the page automatically — no more Ctrl+Shift+R needed.
registerSW({
  onRegisteredSW(swUrl, r) {
    // Check for updates every 60 seconds while the app is open
    setInterval(async () => {
      if (!r) return
      if (r.installing) return
      if (navigator.onLine) {
        await r.update()
      }
    }, 60 * 1000)
  },
  onNeedRefresh() {
    // New version available — reload immediately (skipWaiting handles activation)
    window.location.reload()
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline')
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
