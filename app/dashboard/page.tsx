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
  high: '#dc2626',
  medium: '#d97706',
  low: '#16a34a',
}

const categoryEmoji = {
  meeting: '📅',
  task: '✅',
  promo: '🏷️',
  personal: '👤',
  other: '📧',
}

const categoryColor = {
  meeting: '#2563eb',
  task: '#7c3aed',
  promo: '#d97706',
  personal: '#db2777',
  other: '#475569',
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
      height: '100vh', background: '#f8fafc', color: '#1e293b'
    }}>
      Loading...
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1e293b',
      fontFamily: 'Georgia, serif',
    }}>

      {/* Header */}
      <div style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
  <svg width="200" height="45" viewBox="0 0 680 160" role="img">
    <defs>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
      <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#f43f5e"/>
      </linearGradient>
    </defs>
    <rect x="10" y="15" width="80" height="55" rx="8" fill="url(#purpleGrad)"/>
    <polygon points="10,15 50,48 90,15" fill="#4f46e5"/>
    <line x1="10" y1="70" x2="38" y2="44" stroke="white" strokeWidth="1.5" opacity="0.4"/>
    <line x1="90" y1="70" x2="62" y2="44" stroke="white" strokeWidth="1.5" opacity="0.4"/>
    <circle cx="30" cy="56" r="3" fill="white" opacity="0.6"/>
    <circle cx="50" cy="60" r="3" fill="white" opacity="0.6"/>
    <circle cx="70" cy="56" r="3" fill="white" opacity="0.6"/>
    <rect x="72" y="5" width="26" height="14" rx="7" fill="url(#pinkGrad)"/>
    <text x="85" y="15.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" fontWeight="700" fill="white">AI</text>
    <text x="105" y="48" fontFamily="Georgia, serif" fontSize="28" fontWeight="700" fill="#1e293b">Email</text>
    <text x="105" y="80" fontFamily="Georgia, serif" fontSize="28" fontWeight="700" fill="url(#purpleGrad)">Digest</text>
  </svg>
</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{
            padding: '0.4rem 1.2rem',
            background: '#ef4444',
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
          width: '300px', flexShrink: 0,
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          height: 'fit-content',
          position: 'sticky',
          top: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#1e293b', fontWeight: '700' }}>
            📊 Priority Table
          </h3>

          {urgentEmails.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '0.75rem',
              marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem' }}>
                🚨 URGENT ACTION NEEDED
              </div>
              {urgentEmails.map(e => (
                <div key={e.id}
                  onClick={() => setSummaryEmail(e)}
                  style={{
                    fontSize: '0.75rem', color: '#b91c1c',
                    padding: '0.25rem 0',
                    borderBottom: '1px solid #fecaca',
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
                  background: '#f8fafc',
                  borderRadius: '8px',
                  padding: '0.6rem 0.75rem',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${categoryColor[email.category]}`,
                  border: '1px solid #e2e8f0',
                  borderLeftWidth: '3px',
                  borderLeftColor: categoryColor[email.category],
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', color: categoryColor[email.category], fontWeight: 'bold' }}>
                    {categoryEmoji[email.category]} {email.category.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    background: priorityColor[email.priority] + '18',
                    color: priorityColor[email.priority],
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}>
                    {email.importance_score}/10
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: '500', marginBottom: '0.2rem' }}>
                  {email.subject.slice(0, 35)}{email.subject.length > 35 ? '...' : ''}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
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
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#1e293b' }}>
                Today&apos;s Important Emails
              </h2>
              <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                AI-ranked top 10 from today&apos;s inbox
              </p>
            </div>
            <button
              onClick={fetchEmails}
              disabled={emailsLoading}
              style={{
                padding: '0.6rem 1.4rem',
                background: '#6366f1',
                border: 'none',
                color: 'white', borderRadius: '10px',
                cursor: 'pointer', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontWeight: '500',
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
                  border: activeCategory === cat ? 'none' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: activeCategory === cat ? 'bold' : 'normal',
                  background: activeCategory === cat ? '#6366f1' : '#ffffff',
                  color: activeCategory === cat ? 'white' : '#64748b',
                  transition: 'all 0.2s',
                  boxShadow: activeCategory === cat ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                {cat === 'all' ? '📬' : categoryEmoji[cat as keyof typeof categoryEmoji]} {cat.charAt(0).toUpperCase() + cat.slice(1)} ({countByCategory(cat)})
              </button>
            ))}
          </div>

          {/* Email list */}
          {emailsLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
              <p style={{ fontSize: '1rem' }}>AI is reading and categorising your emails...</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>This may take 20–40 seconds</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>
              {emails.length === 0 ? 'No emails found for today.' : `No ${activeCategory} emails today.`}
            </p>
          ) : (
            filteredEmails.map((email) => (
              <div key={email.id} style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1rem',
                border: '1px solid #e2e8f0',
                borderLeft: `4px solid ${priorityColor[email.priority]}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                {(email.action_required || email.importance_score >= 8) && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.3rem 0.75rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    fontWeight: 'bold',
                  }}>
                    🚨 Urgent Action Needed — {email.summary.slice(0, 80)}
                  </div>
                )}

                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                  {categoryEmoji[email.category]} {email.subject}
                </div>

                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                  <span>From: {email.from}</span>
                  <span>·</span>
                  <span>{new Date(email.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{
                    padding: '0.1rem 0.5rem',
                    background: categoryColor[email.category] + '15',
                    color: categoryColor[email.category],
                    borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold'
                  }}>
                    {email.category.toUpperCase()}
                  </span>
                  {email.priority !== 'low' && (
                    <span style={{
                      padding: '0.1rem 0.5rem',
                      background: priorityColor[email.priority] + '15',
                      color: priorityColor[email.priority],
                      borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold'
                    }}>
                      {email.priority.toUpperCase()}
                    </span>
                  )}
                  <span style={{ color: '#d97706', fontSize: '0.72rem' }}>
                    ⭐ {email.importance_score}/10
                  </span>
                </div>

                <div style={{
                  background: '#f1f5f9',
                  borderRadius: '8px', padding: '0.6rem 1rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.88rem', color: '#475569', lineHeight: '1.5'
                }}>
                  <span style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '0.72rem' }}>AI SUMMARY · </span>
                  {email.summary}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedEmail(email)}
                    style={{
                      padding: '0.4rem 1rem',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem',
                      fontWeight: '500',
                    }}
                  >
                    👁️ View Email
                  </button>
                  <button
                    onClick={() => setSummaryEmail(email)}
                    style={{
                      padding: '0.4rem 1rem',
                      background: '#ede9fe',
                      color: '#6366f1',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem',
                      fontWeight: '500',
                    }}
                  >
                    📋 View Summary
                  </button>
                  <button
                    onClick={() => handleReply(email)}
                    style={{
                      padding: '0.4rem 1rem',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem',
                      fontWeight: '500',
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
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px', padding: '2rem',
              maxWidth: '680px', width: '100%',
              maxHeight: '80vh', overflowY: 'auto',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{selectedEmail.subject}</h2>
              <button onClick={() => setSelectedEmail(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1rem' }}>
              From: {selectedEmail.from} · {new Date(selectedEmail.date).toLocaleString()}
            </div>
            <div style={{
              background: '#ede9fe', borderRadius: '8px',
              padding: '0.75rem 1rem', marginBottom: '1rem',
              color: '#6366f1', fontSize: '0.85rem'
            }}>
              <strong>AI Summary:</strong> {selectedEmail.summary}
            </div>

            {selectedEmail.html ? (
              <iframe
                srcDoc={selectedEmail.html}
                style={{
                  width: '100%', height: '400px',
                  border: 'none', borderRadius: '8px',
                  background: 'white', marginBottom: '1.5rem',
                }}
                sandbox="allow-same-origin"
              />
            ) : (
              <div style={{
                color: '#475569', fontSize: '0.88rem', lineHeight: '1.7',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '1.5rem'
              }}>
                {selectedEmail.body || selectedEmail.snippet}
              </div>
            )}

            <button
              onClick={() => handleReply(selectedEmail)}
              style={{
                width: '100%', padding: '0.75rem',
                background: '#6366f1',
                color: 'white', border: 'none',
                borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem',
                fontWeight: '500',
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
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px', padding: '2rem',
              maxWidth: '500px', width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>📋 Email Summary</h2>
              <button onClick={() => setSummaryEmail(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1rem' }}>
              {categoryEmoji[summaryEmail.category]} {summaryEmail.subject}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: categoryColor[summaryEmail.category] + '15',
                color: categoryColor[summaryEmail.category],
                borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
              }}>
                {categoryEmoji[summaryEmail.category]} {summaryEmail.category.toUpperCase()}
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: priorityColor[summaryEmail.priority] + '15',
                color: priorityColor[summaryEmail.priority],
                borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
              }}>
                {summaryEmail.priority.toUpperCase()} PRIORITY
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: '#fef3c7',
                color: '#d97706',
                borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
              }}>
                ⭐ {summaryEmail.importance_score}/10
              </span>
              {summaryEmail.action_required && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold'
                }}>
                  🚨 ACTION NEEDED
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              From: {summaryEmail.from} · {new Date(summaryEmail.date).toLocaleString()}
            </div>

            <div style={{
              background: '#f1f5f9',
              borderRadius: '10px', padding: '1rem',
              marginBottom: '1.5rem',
              color: '#1e293b', fontSize: '0.92rem', lineHeight: '1.6'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold', marginBottom: '0.5rem' }}>AI SUMMARY</div>
              {summaryEmail.summary}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setSummaryEmail(null); setSelectedEmail(summaryEmail) }}
                style={{
                  flex: 1, padding: '0.65rem',
                  background: '#f1f5f9',
                  color: '#475569', border: '1px solid #e2e8f0',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
                  fontWeight: '500',
                }}
              >
                👁️ View Full Email
              </button>
              <button
                onClick={() => handleReply(summaryEmail)}
                style={{
                  flex: 1, padding: '0.65rem',
                  background: '#6366f1',
                  color: 'white', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
                  fontWeight: '500',
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