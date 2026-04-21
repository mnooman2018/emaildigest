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
      prompt: `You are an expert email analyst for a corporate professional. Analyze this email and respond with ONLY a valid JSON object.

CATEGORIZATION RULES:
- "meeting" = calendar invite, Google Meet/Zoom/Teams link, interview scheduled, meeting request, spreadsheet/doc shared for collaboration
- "task" = approval needed, deadline, form submission, action required, bug report, system alert, OTP, verification code, account action needed
- "personal" = a real human writing directly to you personally
- "other" = bank statements, receipts, delivery updates, account notifications, statements, equity reports

IMPORTANCE SCORE RULES (1-10):
- 9-10 = Meetings, interviews, urgent deadlines, OTP/verification needed NOW
- 7-8 = Tasks requiring action, personal emails from real people, delivery updates
- 5-6 = Bank statements, account notifications, equity reports
- 3-4 = General updates, newsletters from known services
- 1-2 = Pure promotional content (should rarely appear)

Subject: ${subject}
From: ${from}
Body: ${cleanBody}

Respond with ONLY this JSON (no markdown, no backticks):
{"summary":"2-3 sentence specific summary","importance_score":5,"priority":"medium","action_required":false,"category":"other"}`,
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
      summary: body.replace(/<[^>]*>/g, ' ').slice(0, 200),
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
      if (part.mimeType === 'text/html' && part.body?.data)
        html = Buffer.from(part.body.data, 'base64').toString('utf-8')
      if (part.mimeType === 'text/plain' && part.body?.data)
        text = Buffer.from(part.body.data, 'base64').toString('utf-8')
      if (part.parts) {
        for (const subpart of part.parts) {
          if (subpart.mimeType === 'text/html' && subpart.body?.data)
            html = Buffer.from(subpart.body.data, 'base64').toString('utf-8')
          if (subpart.mimeType === 'text/plain' && subpart.body?.data)
            text = Buffer.from(subpart.body.data, 'base64').toString('utf-8')
        }
      }
    }
  }
  return { text, html }
}

function isPromo(from: string, subject: string): boolean {
  const f = from.toLowerCase()
  const s = subject.toLowerCase()

  // ✅ NEVER block these — always important
  const alwaysAllow = [
    'google.com',
    'googleusercontent.com',
    'accounts.google.com',
    'drive.google.com',
    'calendar.google.com',
    'github.com',
    'linkedin.com',        // real connection messages (not job alerts)
    'hdfc',
    'hdfcbank',
    'icici',
    'sbi',
    'axis',
    'kotak',
    'amazon',              // delivery updates
    'flipkart',            // delivery updates
    'swiggy',
    'zomato',
    'dunzo',
    'blinkit',
    'zepto',
    'ola',
    'uber',
    'irctc',
    'noreply@accounts.google',
    'noreply@google',
  ]
  if (alwaysAllow.some(k => f.includes(k))) return false

  // ✅ Always allow OTP / verification / delivery emails by subject
  const alwaysAllowSubjects = [
    'otp', 'one time password', 'verification code', 'verify',
    'your order', 'order confirmed', 'order shipped', 'out for delivery',
    'delivered', 'payment confirmed', 'payment receipt',
    'invoice', 'ticket', 'booking confirmed',
    'shared with you',      // Google Drive/Docs shares
    'invited you',          // Google Meet / Calendar invites
    'has shared',
    'spreadsheet',
    'document',
    'statement',            // bank statements
    'account statement',
  ]
  if (alwaysAllowSubjects.some(k => s.includes(k))) return false

  // ❌ Block pure marketing / bulk senders
  const bulkSenders = [
    'newsletter@', 'marketing@', 'offers@',
    'promotions@', 'campaigns@', 'noreply@mailchimp',
    'sendgrid', 'mailchimp', 'klaviyo', 'hubspot',
    'amazonses.com',
  ]
  if (bulkSenders.some(k => f.includes(k))) return true

  // ❌ Block obvious promo subjects
  const promoSubjects = [
    '% off', 'flash sale', 'mega sale', 'limited offer', 'exclusive deal',
    'job alert', 'new jobs match', 'jobs for you',
    'weekly digest', 'unsubscribe',
    'invest now', 'earn money', 'mutual fund', 'sip now',
  ]
  if (promoSubjects.some(k => s.includes(k))) return true

  return false
}

export async function GET(request: Request) {
  // ─── Step 1: Authenticate ─────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')
  let userId: string | null = null

  if (bearerToken) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user }, error } = await adminClient.auth.getUser(bearerToken)
    console.log('Bearer auth user:', user?.id, 'error:', error?.message)
    if (user) userId = user.id
  }

  if (!userId) {
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
    if (session?.user?.id) userId = session.user.id
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: corsHeaders }
    )
  }

  // ─── Step 2: Get Gmail tokens ──────────────────────────────────────────────
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
    return NextResponse.json(
      { error: 'Gmail not connected' },
      { status: 401, headers: corsHeaders }
    )
  }

  // ─── Step 3: Gmail client ──────────────────────────────────────────────────
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({
    access_token: conn.access_token,
    refresh_token: conn.refresh_token,
  })

  const gmail = google.gmail({ version: 'v1', auth })

  // ─── Step 4: Date filter ───────────────────────────────────────────────────
  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date')
  const dateStr = dateParam || new Date().toISOString().split('T')[0]
  const [year, month, day] = dateStr.split('-')

  const currentDate = new Date(`${dateStr}T00:00:00Z`)
  currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  const nextYear = currentDate.getUTCFullYear()
  const nextMonth = String(currentDate.getUTCMonth() + 1).padStart(2, '0')
  const nextDay = String(currentDate.getUTCDate()).padStart(2, '0')

  // Only exclude social tab — keep everything else including promotions tab
  // so we can manually filter what matters vs pure spam
  const gmailQuery = `in:inbox after:${year}/${month}/${day} before:${nextYear}/${nextMonth}/${nextDay} -category:social`

  console.log('Gmail query:', gmailQuery)

  // ─── Step 5: Fetch ALL emails for that date (up to 100) ───────────────────
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 100,   // ✅ Get all emails, not just 50
    q: gmailQuery,
  })

  console.log('Messages found:', response.data.messages?.length || 0)

  const messages = response.data.messages || []

  // ─── Step 6: Get details + AI summaries ───────────────────────────────────
  const emailResults = await Promise.all(
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

      // Skip pure promo emails
      if (isPromo(from, subject)) {
        console.log('Skipping promo:', subject)
        return null
      }

      const ai = await summarizeEmail(subject, from, text || snippet)

      // ✅ Skip if AI also rates it as promo or importance <= 2
      if (ai.category === 'promo' || ai.importance_score <= 2) {
        console.log('Skipping low importance:', subject, ai.importance_score)
        return null
      }

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

  // ─── Step 7: Filter nulls, sort by importance score (10 → 2) ──────────────
  // ✅ Return ALL emails sorted by importance — no artificial top 10 limit
  const sortedEmails = emailResults
    .filter(e => e !== null)
    .sort((a, b) => b!.importance_score - a!.importance_score)

  console.log('Final emails returned:', sortedEmails.length)

  return NextResponse.json({ emails: sortedEmails }, { headers: corsHeaders })
}