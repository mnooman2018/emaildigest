'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface Email {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [emailsLoading, setEmailsLoading] = useState(false)
  const router = useRouter()

  const fetchEmails = useCallback(async () => {
    setEmailsLoading(true)
    const res = await fetch('/api/emails')
    const data = await res.json()
    if (data.emails) setEmails(data.emails)
    setEmailsLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      setLoading(false)
      fetchEmails()
    }

    init()
  }, [router, fetchEmails])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#60a5fa' }}>📧 EmailDigest</h1>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{user?.email}</span>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Today&apos;s Unread Emails</h2>
          <button
            onClick={fetchEmails}
            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>

        {emailsLoading ? (
          <p style={{ color: '#94a3b8' }}>Fetching your emails...</p>
        ) : emails.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No unread emails found.</p>
        ) : (
          emails.map((email) => (
            <div key={email.id} style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1rem',
              borderLeft: '4px solid #3b82f6'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{email.subject || '(No subject)'}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                From: {email.from} · {new Date(email.date).toLocaleDateString()}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{email.snippet}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}