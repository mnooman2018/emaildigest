'use client'

import { useEffect, useState } from 'react'

export default function ExtensionAuth() {
  const [status, setStatus] = useState('loading')
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      // ✅ Write token to localStorage so extension background can find it
      try {
        localStorage.setItem('ed_pending_token', token)
        localStorage.setItem('ed_pending_token_ts', Date.now().toString())
      } catch { /* ignore */ }

      // ✅ Post message (in case content script is listening on this tab)
      window.postMessage({ type: 'ED_TOKEN_READY', token }, '*')

      // ✅ Also store in sessionStorage as backup
      try {
        sessionStorage.setItem('ed_token', token)
      } catch { /* ignore */ }

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
            <p style={{ color: '#16a34a', fontSize: '1rem', fontWeight: '600' }}>Login successful!</p>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem' }}>
              Closing in {countdown} seconds...
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Go back to Gmail and click "Done! Load My Emails"
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <p style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: '600' }}>Something went wrong.</p>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Please close this tab and try again from Gmail.
            </p>
          </>
        )}
      </div>
    </main>
  )
}