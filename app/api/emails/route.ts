import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { groq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { z } from 'zod'

const EmailSummarySchema = z.object({
  summary: z.string(),
  importance_score: z.number().min(1).max(10),
  priority: z.enum(['high', 'medium', 'low']),
  action_required: z.boolean(),
  category: z.enum(['meeting', 'task', 'promo', 'personal', 'other']),
})

async function summarizeEmail(subject: string, from: string, body: string) {
  try {
    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      schema: EmailSummarySchema,
      prompt: `Analyze this email and give importance score 1-10 (10 = most important):
Subject: ${subject}
From: ${from}
Body: ${body.slice(0, 1000)}`,
    })
    return object
  } catch {
    return {
      summary: body.slice(0, 150),
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

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 20,
    q: 'in:inbox is:unread',
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
      const body = extractBody(detail.data.payload)
      const snippet = detail.data.snippet || ''

      const ai = await summarizeEmail(subject, from, body || snippet)

      return {
        id: msg.id,
        subject: subject || '(No subject)',
        from,
        date,
        snippet,
        body: body || snippet,
        ...ai,
      }
    })
  )

  const top5 = emails
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 5)

  return NextResponse.json({ emails: top5 })
}