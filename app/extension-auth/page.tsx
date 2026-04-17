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
        
        // Send token to the extension panel
        if (window.opener) {
          window.opener.postMessage({
            type: 'emaildigest-token',
            token: session.access_token,
            email: session.user.email,
          }, '*')
        }

        setStatus('done')
        
        // Close after short delay
        setTimeout(() => {
          window.close()
        }, 800)
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
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Connecting...</p>
          </>
        )}
        {status === 'saving' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: '#6366f1', fontSize: '0.9rem' }}>Login successful!</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: '#16a34a', fontSize: '0.9rem' }}>Done! Closing window...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>Please try again.</p>
          </>
        )}
      </div>
    </main>
  )
}