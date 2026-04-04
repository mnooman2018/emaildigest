import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'

async function summarizeEmail(subject: string, from: string, body: string) {
  try {
    const cleanBody = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500)

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Analyze this email and respond with ONLY a JSON object, no other text.

CATEGORY RULES:
- "promo" = company/brand/noreply sender, marketing, deals, offers, newsletters, shopping, food delivery, travel, entertainment, job alerts
- "meeting" = calendar invite, interview, meeting request, zoom/teams/meet link
- "task" = deployment failure, error alert, action required, approval needed, deadline, bug report
- "personal" = personal gmail address writing personally to you
- "other" = nothing else fits

IMPORTANCE: promo=1-3, personal=7-9, task=6-8, meeting=8-10
PRIORITY: importance 1-3=low, 4-6=medium, 7-10=high

Subject: ${subject}
From: ${from}
Body: ${cleanBody}

Respond with ONLY this JSON (no markdown, no explanation):
{"summary":"...","importance_score":5,"priority":"medium","action_required":false,"category":"other"}`,
    })

    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      summary: String(parsed.summary || ''),
      importance_score: Number(parsed.importance_score || 5),
      priority: (parsed.priority as 'high' | 'medium' | 'low') || 'medium',
      action_required: Boolean(parsed.action_required || false),
      category: (parsed.category as 'meeting' | 'task' | 'promo' | 'personal' | 'other') || 'other',
    }
  } catch (err) {
    console.error('AI FAILED for:', subject, err)
    return {
      summary: body.replace(/<[^>]*>/g, ' ').slice(0, 150),
      importance_score: 5,
      priority: 'medium' as const,
      action_required: false,
      category: 'other' as const,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBody(payload: any): string {
  if (!payload) return ''
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
  }
  return ''
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: conn } = await supabase
    .from('gmail_connections')
    .select('access_token, refresh_token')
    .eq('user_id', session.user.id)
    .single()

  if (!conn) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 })
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({
    access_token: conn.access_token,
    refresh_token: conn.refresh_token,
  })

  const gmail = google.gmail({ version: 'v1', auth })

  const today = new Date()
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 50,
    q: `in:inbox after:${dateStr}`,
  })

  const messages = response.data.messages || []

  const emails = await Promise.all(
    messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })

      const headers = detail.data.payload?.headers || []
      const get = (name: string) =>
        headers.find((h) => h.name === name)?.value || ''

      const subject = get('Subject')
      const from = get('From')
      const date = get('Date')
      const messageId = get('Message-ID')
      const body = extractBody(detail.data.payload)
      const snippet = detail.data.snippet || ''
      const threadId = detail.data.threadId || ''

      const ai = await summarizeEmail(subject, from, body || snippet)

      return {
        id: msg.id,
        threadId,
        messageId,
        subject: subject || '(No subject)',
        from,
        date,
        snippet,
        body: body || snippet,
        ...ai,
      }
    })
  )

  const top10 = emails
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 10)

  return NextResponse.json({ emails: top10 })
}