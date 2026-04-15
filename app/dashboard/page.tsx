'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface Email {
  id: string
  threadId: string
  messageId: string
  subject: string
  from: string
  date: string
  snippet: string
  body: string
  html: string
  summary: string
  importance_score: number
  priority: 'high' | 'medium' | 'low'
  action_required: boolean
  category: 'meeting' | 'task' | 'promo' | 'personal' | 'other'
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

const categoryColor = {
  meeting: '#3b82f6',
  task: '#8b5cf6',
  promo: '#f59e0b',
  personal: '#ec4899',
  other: '#64748b',
}

const CATEGORY_ORDER = ['meeting', 'task', 'personal', 'promo', 'other']
const CATEGORIES = ['all', 'meeting', 'task', 'promo', 'personal', 'other'] as const

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [summaryEmail, setSummaryEmail] = useState<Email | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const router = useRouter()

  const fetchEmails = useCallback(async () => {
    setEmailsLoading(true)
    try {
      const res = await fetch('/api/emails')
      const data = await res.json()
      if (data.emails) setEmails(data.emails)
    } catch (err) {
      console.error('Failed to fetch emails:', err)
    }
    setEmailsLoading(false)
  }, [])

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleReply = (email: Email) => {
    const match = email.from.match(/<(.+)>/)
    const replyTo = match ? match[1] : email.from
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(replyTo)}&su=${encodeURIComponent('Re: ' + email.subject)}&in_reply_to=${encodeURIComponent(email.messageId)}&references=${encodeURIComponent(email.messageId)}`
    window.open(gmailUrl, '_blank')
  }

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

  const filteredEmails = activeCategory === 'all'
    ? emails
    : emails.filter(e => e.category === activeCategory)

  const countByCategory = (cat: string) =>
    cat === 'all' ? emails.length : emails.filter(e => e.category === cat).length

  const priorityTableEmails = [...emails].sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (catDiff !== 0) return catDiff
    return b.importance_score - a.importance_score
  })

  const urgentEmails = emails.filter(e => e.action_required || e.importance_score >= 8)

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a1e 100%)',
      color: 'white'
    }}>
      Loading...
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #3d1020 100%)',
      color: 'white',
      fontFamily: 'Georgia, serif',
    }}>

      {/* Header */}
      <div style={{
        padding: '1.25rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.3rem' }}>✉️</span>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600', color: '#e2d9f3' }}>
            EmailDigest
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#9b8fc0', fontSize: '0.85rem' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{
            padding: '0.4rem 1.2rem',
            background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
            color: 'white', border: 'none',
            borderRadius: '8px', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: '500',
          }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '1.5rem', padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

        {/* LEFT SIDEBAR */}
        <div style={{
          width: '320px', flexShrink: 0,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '1.25rem',
          height: 'fit-content',
          position: 'sticky',
          top: '1rem',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#e2d9f3', fontWeight: '700' }}>
            📊 Priority Table
          </h3>

          {urgentEmails.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              padding: '0.75rem',
              marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>
                🚨 URGENT ACTION NEEDED
              </div>
              {urgentEmails.map(e => (
                <div key={e.id}
                  onClick={() => setSummaryEmail(e)}
                  style={{
                    fontSize: '0.75rem', color: '#fca5a5',
                    padding: '0.25rem 0',
                    borderBottom: '1px solid rgba(239,68,68,0.15)',
                    cursor: 'pointer',
                  }}
                >
                  · {e.subject.slice(0, 40)}{e.subject.length > 40 ? '...' : ''}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {priorityTableEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSummaryEmail(email)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.75rem',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${categoryColor[email.category]}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', color: categoryColor[email.category], fontWeight: 'bold' }}>
                    {categoryEmoji[email.category]} {email.category.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    background: priorityColor[email.priority] + '33',
                    color: priorityColor[email.priority],
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}>
                    {email.importance_score}/10
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#e2d9f3', fontWeight: '500', marginBottom: '0.2rem' }}>
                  {email.subject.slice(0, 35)}{email.subject.length > 35 ? '...' : ''}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9b8fc0' }}>
                  {email.summary.slice(0, 60)}{email.summary.length > 60 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#f0ebff' }}>
                Today&apos;s Important Emails
              </h2>
              <p style={{ margin: '0.3rem 0 0', color: '#9b8fc0', fontSize: '0.85rem' }}>
                AI-ranked top 10 from today&apos;s inbox
              </p>
            </div>
            <button
              onClick={fetchEmails}
              disabled={emailsLoading}
              style={{
                padding: '0.6rem 1.4rem',
                background: 'rgba(139, 92, 246, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.5)',
                color: '#c4b5fd', borderRadius: '10px',
                cursor: 'pointer', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              🔄 {emailsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  border: activeCategory === cat
                    ? '1px solid rgba(139,92,246,0.8)'
                    : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: activeCategory === cat ? 'bold' : 'normal',
                  background: activeCategory === cat
                    ? 'rgba(139, 92, 246, 0.3)'
                    : 'rgba(255,255,255,0.05)',
                  color: activeCategory === cat ? '#c4b5fd' : '#9b8fc0',
                  transition: 'all 0.2s',
                }}
              >
                {cat === 'all' ? '📬' : categoryEmoji[cat as keyof typeof categoryEmoji]} {cat.charAt(0).toUpperCase() + cat.slice(1)} ({countByCategory(cat)})
              </button>
            ))}
          </div>

          {/* Email list */}
          {emailsLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#9b8fc0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
              <p style={{ fontSize: '1rem' }}>AI is reading and categorising your emails...</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>This may take 20–40 seconds</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <p style={{ color: '#9b8fc0', textAlign: 'center', padding: '3rem' }}>
              {emails.length === 0 ? 'No emails found for today.' : `No ${activeCategory} emails today.`}
            </p>
          ) : (
            filteredEmails.map((email) => (
              <div key={email.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1rem',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `4px solid ${priorityColor[email.priority]}`,
                backdropFilter: 'blur(10px)',
              }}>
                {(email.action_required || email.importance_score >= 8) && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '0.3rem 0.75rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    fontWeight: 'bold',
                  }}>
                    🚨 Urgent Action Needed — {email.summary.slice(0, 80)}
                  </div>
                )}

                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#f0ebff', marginBottom: '0.5rem' }}>
                  {categoryEmoji[email.category]} {email.subject}
                </div>

                <div style={{ color: '#9b8fc0', fontSize: '0.78rem', marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                  <span>From: {email.from}</span>
                  <span>·</span>
                  <span>{new Date(email.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{
                    padding: '0.1rem 0.5rem',
                    background: categoryColor[email.category] + '33',
                    color: categoryColor[email.category],
                    borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold'
                  }}>
                    {email.category.toUpperCase()}
                  </span>
                  {email.priority !== 'low' && (
                    <span style={{
                      padding: '0.1rem 0.5rem',
                      background: priorityColor[email.priority] + '33',
                      color: priorityColor[email.priority],
                      borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold'
                    }}>
                      {email.priority.toUpperCase()}
                    </span>
                  )}
                  <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>
                    ⭐ {email.importance_score}/10
                  </span>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px', padding: '0.6rem 1rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.88rem', color: '#c4b5fd', lineHeight: '1.5'
                }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '0.72rem' }}>AI SUMMARY · </span>
                  {email.summary}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedEmail(email)}
                    style={{
                      padding: '0.4rem 1rem',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#c4b5fd',
                      border: '1px solid rgba(139,92,246,0.4)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem'
                    }}
                  >
                    👁️ View Email
                  </button>
                  <button
                    onClick={() => setSummaryEmail(email)}
                    style={{
                      padding: '0.4rem 1rem',
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#c4b5fd',
                      border: '1px solid rgba(139,92,246,0.4)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem'
                    }}
                  >
                    📋 View Summary
                  </button>
                  <button
                    onClick={() => handleReply(email)}
                    style={{
                      padding: '0.4rem 1rem',
                      background: 'rgba(139, 92, 246, 0.3)',
                      color: '#c4b5fd',
                      border: '1px solid rgba(139,92,246,0.5)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem'
                    }}
                  >
                    ↩️ Reply in Gmail
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View Full Email Modal */}
      {selectedEmail && (
        <div
          onClick={() => setSelectedEmail(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1e0f3a, #2d1b4e)',
              borderRadius: '16px', padding: '2rem',
              maxWidth: '680px', width: '100%',
              maxHeight: '80vh', overflowY: 'auto',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f0ebff' }}>{selectedEmail.subject}</h2>
              <button onClick={() => setSelectedEmail(null)}
                style={{ background: 'none', border: 'none', color: '#9b8fc0', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ color: '#9b8fc0', fontSize: '0.82rem', marginBottom: '1rem' }}>
              From: {selectedEmail.from} · {new Date(selectedEmail.date).toLocaleString()}
            </div>
            <div style={{
              background: 'rgba(139,92,246,0.15)', borderRadius: '8px',
              padding: '0.75rem 1rem', marginBottom: '1rem',
              color: '#c4b5fd', fontSize: '0.85rem'
            }}>
              <strong>AI Summary:</strong> {selectedEmail.summary}
            </div>

            {/* HTML email rendering */}
            {selectedEmail.html ? (
              <iframe
                srcDoc={selectedEmail.html}
                style={{
                  width: '100%',
                  height: '400px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'white',
                  marginBottom: '1.5rem',
                }}
                sandbox="allow-same-origin"
              />
            ) : (
              <div style={{
                color: '#c4b5fd', fontSize: '0.88rem', lineHeight: '1.7',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '1.5rem'
              }}>
                {selectedEmail.body || selectedEmail.snippet}
              </div>
            )}

            <button
              onClick={() => handleReply(selectedEmail)}
              style={{
                width: '100%', padding: '0.75rem',
                background: 'linear-gradient(135deg, #6b46c1, #8b5cf6)',
                color: 'white', border: 'none',
                borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem'
              }}
            >
              ↩️ Reply in Gmail
            </button>
          </div>
        </div>
      )}

      {/* View Summary Modal */}
      {summaryEmail && (
        <div
          onClick={() => setSummaryEmail(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1e0f3a, #2d1b4e)',
              borderRadius: '16px', padding: '2rem',
              maxWidth: '500px', width: '100%',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#f0ebff' }}>📋 Email Summary</h2>
              <button onClick={() => setSummaryEmail(null)}
                style={{ background: 'none', border: 'none', color: '#9b8fc0', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2d9f3', marginBottom: '1rem' }}>
              {categoryEmoji[summaryEmail.category]} {summaryEmail.subject}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: categoryColor[summaryEmail.category] + '33',
                color: categoryColor[summaryEmail.category],
                borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
              }}>
                {categoryEmoji[summaryEmail.category]} {summaryEmail.category.toUpperCase()}
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: priorityColor[summaryEmail.priority] + '33',
                color: priorityColor[summaryEmail.priority],
                borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
              }}>
                {summaryEmail.priority.toUpperCase()} PRIORITY
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
              }}>
                ⭐ {summaryEmail.importance_score}/10
              </span>
              {summaryEmail.action_required && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
                }}>
                  🚨 ACTION NEEDED
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#9b8fc0', marginBottom: '1rem' }}>
              From: {summaryEmail.from} · {new Date(summaryEmail.date).toLocaleString()}
            </div>

            <div style={{
              background: 'rgba(139,92,246,0.15)',
              borderRadius: '10px', padding: '1rem',
              marginBottom: '1.5rem',
              color: '#e2d9f3', fontSize: '0.92rem', lineHeight: '1.6'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '0.5rem' }}>AI SUMMARY</div>
              {summaryEmail.summary}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setSummaryEmail(null); setSelectedEmail(summaryEmail) }}
                style={{
                  flex: 1, padding: '0.65rem',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                👁️ View Full Email
              </button>
              <button
                onClick={() => handleReply(summaryEmail)}
                style={{
                  flex: 1, padding: '0.65rem',
                  background: 'linear-gradient(135deg, #6b46c1, #8b5cf6)',
                  color: 'white', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                ↩️ Reply in Gmail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}