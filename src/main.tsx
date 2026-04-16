import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'
import { bootstrapWebApp } from './utils/bootstrap/bootstrapWebApp'
import { restoreAuthSession } from './utils/auth/restoreAuthSession'

async function start() {
  try {
    await restoreAuthSession()
    await bootstrapWebApp()
  } catch {
    /* toast en bootstrapWebApp */
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            },
          }}
        />
      </BrowserRouter>
    </React.StrictMode>,
  )
}

void start()
