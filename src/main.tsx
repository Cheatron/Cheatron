import { useEffect } from 'react'
import ReactDOM from 'react-dom/client'

if (import.meta.env.DEV) {
  const script = document.createElement('script')
  if (import.meta.env.REACT_DEVTOOLS_HOST) {
    script.src = import.meta.env.REACT_DEVTOOLS_HOST
  } else if (import.meta.env.REACT_DEVTOOLS_BIN) {
    script.src = 'http://localhost:8097'
  }

  if (script.src) {
    document.head.appendChild(script)
  }
}

import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import SettingsPage from './pages/Settings'
import VersionsPage from './pages/Versions'
import MemoryViewerPage from './pages/MemoryViewer'
import DebugPage from './pages/Debug'
import AppLayout from './components/Layout'
import { ThemeProvider } from './components/ThemeProvider'

// Global error handler
window.addEventListener('error', event => {
  window.logger.error('App', 'Uncaught error', {
    error: event.error?.message,
    stack: event.error?.stack,
  })
})

window.addEventListener('unhandledrejection', event => {
  window.logger.error('App', 'Unhandled promise rejection', { reason: event.reason })
})

export function App() {
  useEffect(() => {
    // Remove loader after first render
    const appLoader = document.getElementById('app-loader')
    if (appLoader) {
      setTimeout(() => {
        appLoader.style.opacity = '0'
        appLoader.style.transition = 'opacity 0.3s ease'
        setTimeout(() => {
          appLoader.style.display = 'none'
        }, 300)
      }, 100)
    }

    // Log app startup - check if logger is available
    if (window.logger) {
      window.logger.info('App', 'Cheatron application started')
    } else {
      console.warn('window.logger not available yet')
    }
  }, [])

  return (
    <ThemeProvider defaultMode="dark" defaultColor="blue" storageKey="cheatron-theme">
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DebugPage />} />
            <Route path="/memory" element={<MemoryViewerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/versions" element={<VersionsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

import { initGlobals } from './globals'

const root = ReactDOM.createRoot(document.getElementById('root')!)

initGlobals().then(() => {
  root.render(<App />)
})
