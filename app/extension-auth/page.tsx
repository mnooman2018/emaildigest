'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ExtensionAuth() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        setStatus('saving')

        // Save to localStorage
        localStorage.setItem('ed_token', session.access_token)

        // Try postMessage to opener
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'emaildigest-token',
              token: session.access_token,
              email: session.user.email,
            }, '*')
          } catch(e) {}
        }

        // Broadcast to all extension content scripts via custom event
        document.dispatchEvent(new CustomEvent('ed-login', {
          detail: { token: session.access_token }
        }))

        setStatus('done')

        // Show success then close
        setTimeout(() => {
          window.close()
        }, 1500)
      } else {
        setStatus('error')
      }
    }

    handleAuth()
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
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Connecting...</p>
          </>
        )}
        {(status === 'saving' || status === 'done') && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: '#16a34a', fontSize: '1rem', fontWeight: '600' }}>Login successful!</p>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem' }}>
              You can close this tab and go back to Gmail
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>Something went wrong. Please try again.</p>
          </>
        )}
      </div>
    </main>
  )
}