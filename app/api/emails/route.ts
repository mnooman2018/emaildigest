import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

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
function extractBody(payload: any): { text: string; html: string } {
  if (!payload) return { text: '', html: '' }

  let html = ''
  let text = ''

  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    if (payload.mimeType === 'text/html') html = decoded
    else text = decoded
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        html = Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
      if (part.parts) {
        for (const subpart of part.parts) {
          if (subpart.mimeType === 'text/html' && subpart.body?.data) {
            html = Buffer.from(subpart.body.data, 'base64').toString('utf-8')
          }
          if (subpart.mimeType === 'text/plain' && subpart.body?.data) {
            text = Buffer.from(subpart.body.data, 'base64').toString('utf-8')
          }
        }
      }
    }
  }

  return { text, html }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')

  console.log('Bearer token present:', !!bearerToken)

  let userId: string | null = null

  if (bearerToken) {
    // Use service role client to verify token
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user }, error } = await adminClient.auth.getUser(bearerToken)
    console.log('Bearer auth user:', user?.id, 'error:', error?.message)
    if (user) userId = user.id
  }

  if (!userId) {
    // Fall back to cookie session
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
    console.log('Cookie session user:', session?.user?.id)
    if (session?.user?.id) userId = session.user.id
  }

  if (!userId) {
    console.log('No user found - returning 401')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: corsHeaders })
  }

  // Use admin client to query gmail_connections
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: conn, error: connError } = await adminClient
    .from('gmail_connections')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .single()

  console.log('Gmail conn found:', !!conn, 'error:', connError?.message)

  if (!conn) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 401, headers: corsHeaders })
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

  // Support custom date from query param
const url = new URL(request.url)
const dateParam = url.searchParams.get('date')

const targetDate = dateParam ? new Date(dateParam) : new Date()
const istOffset = 5.5 * 60 * 60 * 1000
const istDate = new Date(targetDate.getTime() + istOffset)
const startOfDayIST = new Date(Date.UTC(
  istDate.getUTCFullYear(),
  istDate.getUTCMonth(),
  istDate.getUTCDate(),
  0, 0, 0
) - istOffset)
const endOfDayIST = new Date(startOfDayIST.getTime() + 24 * 60 * 60 * 1000)
const unixStart = Math.floor(startOfDayIST.getTime() / 1000)
const unixEnd = Math.floor(endOfDayIST.getTime() / 1000)

  console.log('Gmail query:', `in:inbox after:${unixStart} before:${unixEnd}`)

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 50,
    q: `in:inbox after:${unixStart} before:${unixEnd}`,
  })

  console.log('Messages found:', response.data.messages?.length || 0)

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
      const { text, html } = extractBody(detail.data.payload)
      const snippet = detail.data.snippet || ''
      const threadId = detail.data.threadId || ''

      const ai = await summarizeEmail(subject, from, text || snippet)

      return {
        id: msg.id,
        threadId,
        messageId,
        subject: subject || '(No subject)',
        from,
        date,
        snippet,
        body: text || snippet,
        html: html || '',
        ...ai,
      }
    })
  )

  const top10 = emails
  .filter(e => e.category !== 'promo')
  .sort((a, b) => b.importance_score - a.importance_score)
  .slice(0, 10)

  return NextResponse.json({ emails: top10 }, { headers: corsHeaders })
}