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
        const token = session.access_token

        // Try sending to Chrome extension
        try {
          // @ts-ignore
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Send to all possible extension IDs via postMessage
            window.postMessage({ type: 'ed-save-token', token }, '*')
          }
        } catch(e) {}

        // Also save in localStorage as backup
        localStorage.setItem('ed_token', token)

        setStatus('done')
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
        {status === 'done' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: '#16a34a', fontSize: '1rem', fontWeight: '600' }}>Login successful!</p>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem' }}>
              Go back to Gmail and click<br/><strong>"Done! Load My Emails"</strong>
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>Please try again.</p>
          </>
        )}
      </div>
    </main>
  )
}