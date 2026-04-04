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
  body: string
  summary: string
  importance_score: number
  priority: 'high' | 'medium' | 'low'
  action_required: boolean
  category: string
}

const priorityColor = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

const categoryEmoji = {
  meeting: '📅',
  task: '✅',
  promo: '🏷️',
  personal: '👤',
  other: '📧',
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
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
      if (!user) { router.push('/'); return }
      setUser(user)
      setLoading(false)
      fetchEmails()
    }
    init()
  }, [router, fetchEmails])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0f1e', color: 'white' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: 'white', fontFamily: 'Georgia, serif' }}>

      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#60a5fa', letterSpacing: '0.05em' }}>📧 EmailDigest</h1>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{user?.email}</span>
      </div>

      <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto' }}>

        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Top 5 Important Emails</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>AI-ranked by importance from your inbox</p>
          </div>
          <button
            onClick={fetchEmails}
            disabled={emailsLoading}
            style={{ padding: '0.5rem 1.25rem', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {emailsLoading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Email list */}
        {emailsLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
            <p>AI is reading and ranking your emails...</p>
            <p style={{ fontSize: '0.8rem' }}>This may take 15–30 seconds</p>
          </div>
        ) : emails.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>No unread emails found.</p>
        ) : (
          emails.map((email, index) => (
            <div key={email.id} style={{
              background: '#111827',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1rem',
              borderLeft: `4px solid ${priorityColor[email.priority]}`,
              position: 'relative',
            }}>
              {/* Rank badge */}
              <div style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: '#1e293b', borderRadius: '50%',
                width: '2rem', height: '2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8'
              }}>
                #{index + 1}
              </div>

              {/* Subject */}
              <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.3rem', paddingRight: '2.5rem' }}>
                {categoryEmoji[email.category as keyof typeof categoryEmoji] || '📧'} {email.subject}
              </div>

              {/* Meta */}
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                From: {email.from} · {new Date(email.date).toLocaleDateString()}
                <span style={{
                  marginLeft: '0.75rem', padding: '0.15rem 0.5rem',
                  background: priorityColor[email.priority] + '22',
                  color: priorityColor[email.priority],
                  borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'
                }}>
                  {email.priority.toUpperCase()}
                </span>
                {email.action_required && (
                  <span style={{
                    marginLeft: '0.5rem', padding: '0.15rem 0.5rem',
                    background: '#7c3aed22', color: '#a78bfa',
                    borderRadius: '4px', fontSize: '0.75rem'
                  }}>
                    ACTION NEEDED
                  </span>
                )}
                <span style={{ marginLeft: '0.5rem', color: '#f59e0b', fontSize: '0.75rem' }}>
                  ⭐ {email.importance_score}/10
                </span>
              </div>

              {/* AI Summary */}
              <div style={{
                background: '#1e293b', borderRadius: '8px',
                padding: '0.75rem 1rem', marginBottom: '0.75rem',
                fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5'
              }}>
                <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '0.75rem' }}>AI SUMMARY · </span>
                {email.summary}
              </div>

              {/* View button */}
              <button
                onClick={() => setSelectedEmail(email)}
                style={{
                  padding: '0.4rem 1rem', background: 'transparent',
                  color: '#60a5fa', border: '1px solid #1d4ed8',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                View Full Email →
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedEmail && (
        <div
          onClick={() => setSelectedEmail(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111827', borderRadius: '16px',
              padding: '2rem', maxWidth: '680px', width: '100%',
              maxHeight: '80vh', overflowY: 'auto',
              border: '1px solid #1e293b'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f1f5f9' }}>{selectedEmail.subject}</h2>
              <button
                onClick={() => setSelectedEmail(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
              >✕</button>
            </div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
              From: {selectedEmail.from} · {new Date(selectedEmail.date).toLocaleDateString()}
            </div>
            <div style={{
              background: '#1e293b', borderRadius: '8px', padding: '1rem',
              marginBottom: '1rem', color: '#60a5fa', fontSize: '0.85rem'
            }}>
              <strong>AI Summary:</strong> {selectedEmail.summary}
            </div>
            <div style={{
              color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.7',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {selectedEmail.body || selectedEmail.snippet}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}