import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

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
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: session.provider_token })

  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 10,
    q: 'in:inbox is:unread',
  })

  const messages = response.data.messages || []

  const emails = await Promise.all(
    messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      })

      const headers = detail.data.payload?.headers || []
      const get = (name: string) =>
        headers.find((h) => h.name === name)?.value || ''

      return {
        id: msg.id,
        subject: get('Subject'),
        from: get('From'),
        date: get('Date'),
        snippet: detail.data.snippet,
      }
    })
  )

  return NextResponse.json({ emails })
}