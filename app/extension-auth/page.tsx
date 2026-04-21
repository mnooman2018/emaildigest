'use client'

import { useEffect, useState } from 'react'

export default function ExtensionAuth() {
  const [status, setStatus] = useState('loading')
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      // Save token to sessionStorage so the extension can read it
      sessionStorage.setItem('ed_token', token)

      // Post message to extension content script (in case it's listening)
      window.postMessage({ type: 'ed-save-token', token }, '*')

      // Also try to send directly to chrome extension storage via a special key
      // The extension will pick this up when the user clicks "Done"
      try {
        // This writes to a known localStorage key the extension polls for
        localStorage.setItem('ed_pending_token', token)
      } catch {
        // ignore if localStorage not available
      }

      setStatus('done')

      let count = 3
      const timer = setInterval(() => {
        count--
        setCountdown(count)
        if (count === 0) {
          clearInterval(timer)
          window.close()
        }
      }, 1000)

      return () => clearInterval(timer)
    } else {
      setStatus('error')
    }
  }, [])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e8e0f5 0%, #f5e6f0 40%, #fde8d8 100%)',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>

        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Connecting your account...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: '#16a34a', fontSize: '1rem', fontWeight: '600' }}>
              Login successful!
            </p>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem' }}>
              This tab will close in {countdown} seconds...
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Go back to Gmail and click "Done! Load My Emails"
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <p style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: '600' }}>
              Something went wrong.
            </p>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Please close this tab and try again from Gmail.
            </p>
          </>
        )}

      </div>
    </main>
  )
}