'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ExtensionAuth() {
  const [status, setStatus] = useState<'loading' | 'saving' | 'done' | 'error'>('loading')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        setStatus('saving')
        // Send token to extension
        window.postMessage({
          type: 'emaildigest-token',
          token: session.access_token,
          email: session.user.email,
        }, '*')

        setTimeout(() => {
          setStatus('done')
          window.close()
        }, 1000)
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
        {status === 'loading' && <p style={{ color: '#64748b' }}>⏳ Checking login...</p>}
        {status === 'saving' && <p style={{ color: '#6366f1' }}>✅ Login successful! Closing...</p>}
        {status === 'done' && <p style={{ color: '#16a34a' }}>✅ Done! You can close this window.</p>}
        {status === 'error' && <p style={{ color: '#dc2626' }}>❌ Please try logging in again.</p>}
      </div>
    </main>
  )
}